from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from uuid import uuid4
import hashlib
import hmac
import json
from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
import httpx

from .config import settings
from .database import Base, engine, get_db
from .models import Service, Order
from .schemas import OrderCreate, AdminLogin, OrderStatusUpdate, ServiceCreate
from .security import verify_admin, create_token, require_admin

DEFAULT_SERVICES = [
    ("Business Website", "business-website", "Professional mobile-friendly website for your business.", "Web Design", 150000, 175, 7),
    ("Online Store", "online-store", "An online shop with product listings and customer enquiries.", "Web Design", 250000, 280, 14),
    ("Landing Page", "landing-page", "A focused landing page designed to generate leads.", "Web Design", 80000, 90, 4),
    ("Business Flyer", "business-flyer", "Professional promotional flyer for digital and print use.", "Graphic Design", 15000, 18, 2),
    ("Social Media Package", "social-media-package", "Branded social media graphics and content package.", "Content & Design", 35000, 38, 4),
    ("WhatsApp Business Setup", "whatsapp-business-setup", "Business profile, catalogue and customer contact setup.", "Automation", 25000, 28, 2),
    ("Business Automation", "business-automation", "Workflow automation to reduce repetitive business tasks.", "Automation", 100000, 110, 7),
    ("Website Maintenance", "website-maintenance", "Website updates, checks and ongoing maintenance.", "Support", 20000, 25, 30),
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    columns = {c["name"] for c in inspect(engine).get_columns("services")}
    if "price_usd" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE services ADD COLUMN price_usd INTEGER NOT NULL DEFAULT 0"))
    with Session(bind=engine) as db:
        existing = {item.slug: item for item in db.query(Service).all()}
        for name, slug, desc, category, price, price_usd, days in DEFAULT_SERVICES:
            if slug not in existing:
                db.add(Service(name=name, slug=slug, description=desc, category=category,
                               price=price, price_usd=price_usd, delivery_days=days))
            elif existing[slug].price_usd == 0:
                existing[slug].price_usd = price_usd
        db.commit()
    yield

app = FastAPI(
    title="HENRICHED DIGITAL SERVICES API",
    description="Digital services ordering, payments and administration.",
    version="1.0.0",
    lifespan=lifespan
)

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

@app.get("/")
def root():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/admin")
def admin_page():
    return FileResponse(FRONTEND_DIR / "admin.html")

@app.get("/api/public-config")
def public_config():
    return {"whatsapp_number": settings.whatsapp_number}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/services")
def list_services(db: Session = Depends(get_db)):
    return db.query(Service).filter(Service.active == 1).order_by(Service.id).all()

@app.get("/api/services/{slug}")
def get_service(slug: str, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.slug == slug, Service.active == 1).first()
    if not service:
        raise HTTPException(404, "Service not found")
    return service

@app.post("/api/orders")
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    service = db.query(Service).filter(Service.id == data.service_id, Service.active == 1).first()
    if not service:
        raise HTTPException(404, "Selected service is unavailable")

    reference = "HDS-" + uuid4().hex[:14].upper()
    selected_price = service.price if data.currency == "NGN" else service.price_usd
    if selected_price <= 0:
        raise HTTPException(400, "This service is not available in the selected currency")
    order = Order(
        reference=reference,
        customer_name=data.customer_name.strip(),
        email=data.email,
        phone=data.phone.strip(),
        service_id=service.id,
        requirements=data.requirements,
        amount=selected_price,
        currency=data.currency
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "reference": order.reference,
        "amount": order.amount,
        "currency": order.currency,
        "status": order.status
    }

@app.post("/api/payments/initialize/{reference}")
async def initialize_payment(reference: str, db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Online payments are not configured yet")

    order = db.query(Order).filter(Order.reference == reference).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.payment_status == "paid":
        raise HTTPException(409, "This order has already been paid")

    payload = {
        "email": order.email,
        "amount": order.amount * 100,
        "currency": order.currency,
        "reference": order.reference,
        "callback_url": settings.frontend_url.rstrip("/") + "/"
    }
    headers = {"Authorization": f"Bearer {settings.paystack_secret_key}"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://api.paystack.co/transaction/initialize",
            json=payload,
            headers=headers
        )
    result = response.json()
    if response.status_code >= 400 or not result.get("status"):
        raise HTTPException(502, "Unable to initialize payment")
    return result["data"]

@app.get("/api/payments/verify/{reference}")
async def verify_payment(reference: str, db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Payment verification is not configured")

    order = db.query(Order).filter(Order.reference == reference).first()
    if not order:
        raise HTTPException(404, "Order not found")

    headers = {"Authorization": f"Bearer {settings.paystack_secret_key}"}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers=headers
            )
        result = response.json()
    except (httpx.RequestError, ValueError):
        raise HTTPException(502, "Unable to contact or read Paystack response")

    if response.status_code >= 400 or not isinstance(result, dict) or not result.get("status"):
        raise HTTPException(502, "Unable to verify payment")

    payment = result.get("data")
    if not isinstance(payment, dict):
        raise HTTPException(502, "Invalid payment verification response")

    if payment.get("status") != "success":
        return {"verified": False, "status": payment.get("status", "pending")}

    if payment.get("reference") != order.reference:
        raise HTTPException(400, "Payment reference does not match order")

    try:
        paid_amount = int(payment.get("amount"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Invalid payment amount")

    if paid_amount != order.amount * 100:
        raise HTTPException(400, "Payment amount does not match order")

    if payment.get("currency") != order.currency:
        raise HTTPException(400, "Payment currency does not match order")

    if order.payment_status != "paid":
        order.payment_status = "paid"
        order.status = "received"
        order.payment_reference = payment["reference"]
        db.commit()

    return {"verified": True, "status": "paid", "reference": reference}


@app.post("/api/payments/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Payment webhook is not configured")

    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        body,
        hashlib.sha512
    ).hexdigest()

    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(401, "Invalid webhook signature")

    try:
        event = json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, "Invalid webhook payload")

    if not isinstance(event, dict):
        raise HTTPException(400, "Invalid webhook payload")

    if event.get("event") != "charge.success":
        return {"received": True}

    payment = event.get("data")
    if not isinstance(payment, dict):
        raise HTTPException(400, "Invalid payment data")

    reference = payment.get("reference")
    if not isinstance(reference, str) or not reference:
        raise HTTPException(400, "Missing payment reference")

    order = db.query(Order).filter(Order.reference == reference).first()
    if not order or payment.get("status") != "success":
        return {"received": True}

    try:
        paid_amount = int(payment.get("amount"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Invalid webhook payment amount")

    if paid_amount != order.amount * 100:
        raise HTTPException(400, "Webhook amount does not match order")

    if payment.get("currency") != order.currency:
        raise HTTPException(400, "Webhook currency does not match order")

    if order.payment_status != "paid":
        order.payment_status = "paid"
        order.status = "received"
        order.payment_reference = reference
        db.commit()

    return {"received": True, "verified": True}


@app.post("/api/admin/login")
def admin_login(data: AdminLogin):
    if not verify_admin(data.email, data.password):
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_token(data.email), "token_type": "bearer"}

@app.get("/api/admin/dashboard")
def admin_dashboard(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return {
        "total_orders": len(orders),
        "paid_orders": sum(1 for o in orders if o.payment_status == "paid"),
        "pending_orders": sum(1 for o in orders if o.payment_status != "paid"),
        "revenue_ngn": sum(o.amount for o in orders if o.payment_status == "paid" and o.currency == "NGN"),
        "revenue_usd": sum(o.amount for o in orders if o.payment_status == "paid" and o.currency == "USD"),
        "recent_orders": orders[:20]
    }

@app.get("/api/admin/orders")
def admin_orders(_admin=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()

@app.patch("/api/admin/orders/{order_id}")
def update_order(order_id: int, data: OrderStatusUpdate,
                 _admin=Depends(require_admin), db: Session = Depends(get_db)):
    allowed = {"received", "in_progress", "waiting_for_customer", "completed", "cancelled"}
    if data.status not in allowed:
        raise HTTPException(400, "Unsupported order status")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = data.status
    db.commit()
    db.refresh(order)
    return {"id": order.id, "status": order.status}

@app.post("/api/admin/services")
def add_service(data: ServiceCreate, _admin=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(Service).filter(Service.slug == data.slug).first():
        raise HTTPException(409, "A service with this slug already exists")
    service = Service(**data.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service
