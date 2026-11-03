from typing import Literal
from pydantic import BaseModel, EmailStr, Field

class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=40)
    service_id: int
    currency: Literal["NGN", "USD"] = "NGN"
    requirements: str = Field(default="", max_length=5000)

class OrderStatusUpdate(BaseModel):
    status: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class ServiceCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    category: str = "Digital Services"
    price: int = Field(ge=0)
    price_usd: int = Field(default=0, ge=0)
    delivery_days: int = Field(default=3, ge=1)
