from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True, nullable=False)
    description = Column(Text, default="")
    category = Column(String(80), default="Digital Services")
    price = Column(Integer, nullable=False, default=0)
    price_usd = Column(Integer, nullable=False, default=0)
    delivery_days = Column(Integer, default=3)
    active = Column(Integer, default=1)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(80), unique=True, index=True, nullable=False)
    customer_name = Column(String(150), nullable=False)
    email = Column(String(200), nullable=False)
    phone = Column(String(40), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    requirements = Column(Text, default="")
    amount = Column(Integer, nullable=False)
    currency = Column(String(5), default="NGN")
    status = Column(String(30), default="pending_payment")
    payment_status = Column(String(30), default="unpaid")
    payment_reference = Column(String(120), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    service = relationship("Service")
