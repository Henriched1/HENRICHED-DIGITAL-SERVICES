const grid=document.getElementById("serviceGrid");
const modal=document.getElementById("orderModal");
const icons=["▣","▤","↗","✧","◈","◉","⚙","⌂"];
let services=[];

const money=(amount,currency="NGN")=>new Intl.NumberFormat(
 currency==="USD"?"en-US":"en-NG",
 {style:"currency",currency,maximumFractionDigits:0}
).format(amount||0);

document.getElementById("year").textContent=new Date().getFullYear();
document.getElementById("menuToggle").onclick=()=>document.getElementById("nav").classList.toggle("open");
document.querySelectorAll("#nav a").forEach(a=>a.onclick=()=>document.getElementById("nav").classList.remove("open"));

const currencySelect=document.getElementById("orderCurrency");

function updateOrderPrice(){
 const id=Number(document.getElementById("serviceId").value);
 const service=services.find(s=>s.id===id);
 if(!service)return;
 const currency=currencySelect.value;
 const price=currency==="USD"?service.price_usd:service.price;
 document.getElementById("orderPrice").textContent=money(price,currency);
}

currencySelect.onchange=updateOrderPrice;

async function loadServices(){
 try{
  const response=await fetch("/api/services");
  if(!response.ok)throw new Error("Unable to load services");
  services=await response.json();

  grid.innerHTML=services.map((s,i)=>`
   <article class="service-card">
    <div class="service-icon">${icons[i%icons.length]}</div>
    <h3>${escapeHtml(s.name)}</h3>
    <p>${escapeHtml(s.description||"Professional digital service for your business.")}</p>
    <div class="service-prices">
     <span class="price">${money(s.price,"NGN")}</span>
     <span class="price-usd">${money(s.price_usd,"USD")}</span>
    </div>
    <div class="service-bottom">
     <button data-service="${s.id}">Order now →</button>
    </div>
   </article>`).join("");

  grid.querySelectorAll("button[data-service]").forEach(
   b=>b.onclick=()=>openOrder(Number(b.dataset.service))
  );
 }catch(e){
  grid.innerHTML='<p>Our services are temporarily unavailable. Please refresh this page shortly.</p>';
 }
}

function escapeHtml(v){
 return String(v??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
 }[c]));
}

function openOrder(id){
 const s=services.find(x=>x.id===id);
 if(!s)return;

 document.getElementById("serviceId").value=s.id;
 document.getElementById("modalTitle").textContent="Order "+s.name;
 document.getElementById("modalDescription").textContent=s.description||"Tell us about your project.";
 currencySelect.value="NGN";
 updateOrderPrice();
 document.getElementById("formMessage").textContent="";
 modal.classList.add("open");
}

document.getElementById("closeModal").onclick=()=>modal.classList.remove("open");
modal.onclick=e=>{if(e.target===modal)modal.classList.remove("open")};

document.getElementById("orderForm").onsubmit=async e=>{
 e.preventDefault();

 const btn=document.getElementById("submitOrder");
 const msg=document.getElementById("formMessage");
 btn.disabled=true;
 btn.textContent="Submitting order…";
 msg.textContent="";

 const payload={
  customer_name:document.getElementById("customerName").value.trim(),
  email:document.getElementById("customerEmail").value.trim(),
  phone:document.getElementById("customerPhone").value.trim(),
  service_id:Number(document.getElementById("serviceId").value),
  currency:currencySelect.value,
  requirements:document.getElementById("requirements").value.trim()
 };

 try{
  const r=await fetch("/api/orders",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify(payload)
  });
  const data=await r.json();
  if(!r.ok)throw new Error(data.detail||"Could not create your order.");

  const p=await fetch("/api/payments/initialize/"+encodeURIComponent(data.reference),{
   method:"POST"
  });
  const payment=await p.json();

  if(!p.ok)throw new Error(payment.detail||"Order created, but payment could not be initialized. Contact us with reference "+data.reference+".");
  if(!payment.authorization_url)throw new Error("Payment link unavailable. Your order reference is "+data.reference);

  window.location.assign(payment.authorization_url);
 }catch(err){
  msg.textContent=err.message;
  btn.disabled=false;
  btn.textContent="Try again →";
 }
};

async function loadContact(){
 try{
  const r=await fetch("/api/public-config");
  if(r.ok){
   const d=await r.json();
   if(d.whatsapp_number){
    const n=d.whatsapp_number.replace(/\D/g,"");
    document.getElementById("whatsappLink").href="https://wa.me/"+n;
   }
  }
 }catch(e){}
}

const params=new URLSearchParams(location.search);
if(params.get("reference")){
 fetch("/api/payments/verify/"+encodeURIComponent(params.get("reference")))
  .then(r=>r.json())
  .then(d=>{
   alert(d.verified?"Payment confirmed. Thank you.":"Payment status: "+(d.status||"pending")+".");
   history.replaceState({}, "", "/");
  })
  .catch(()=>alert("We could not confirm your payment yet. Please contact us with your payment reference."));
}

loadServices();
loadContact();

document.getElementById("hdsTrackForm")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const result = document.getElementById("hdsTrackResult");
  const reference = document.getElementById("hdsTrackReference").value.trim();
  const email = document.getElementById("hdsTrackEmail").value.trim();
  result.textContent = "Checking your order...";
  try {
    const query = new URLSearchParams({reference, email});
    const response = await fetch("/api/orders/track?" + query);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to find order.");
    result.textContent = "Order: " + data.reference +
      " | Service: " + data.service +
      " | Status: " + data.status +
      " | Payment: " + data.payment_status;
  } catch (error) {
    result.textContent = error.message;
  }
});
