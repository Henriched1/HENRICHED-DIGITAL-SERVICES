const $=id=>document.getElementById(id);
let token=localStorage.getItem("hds_admin_token")||"";

const money=(n,currency="NGN")=>new Intl.NumberFormat(
 currency==="USD"?"en-US":"en-NG",
 {style:"currency",currency,maximumFractionDigits:0}
).format(n||0);

async function request(path,options={}){
 const r=await fetch(path,{
  ...options,
  headers:{
   "Content-Type":"application/json",
   ...(token?{Authorization:"Bearer "+token}:{}),
   ...(options.headers||{})
  }
 });
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.detail||"Request failed");
 return data;
}

function showDashboard(){
 $("loginPanel").hidden=true;
 $("dashboardPanel").hidden=false;
 refresh();
}

function showLogin(){
 $("loginPanel").hidden=false;
 $("dashboardPanel").hidden=true;
}

$("loginForm").onsubmit=async e=>{
 e.preventDefault();
 $("loginMessage").textContent="Signing in…";

 try{
  const d=await request("/api/admin/login",{
   method:"POST",
   body:JSON.stringify({
    email:$("adminEmail").value,
    password:$("adminPassword").value
   })
  });
  token=d.access_token;
  localStorage.setItem("hds_admin_token",token);
  showDashboard();
 }catch(err){
  $("loginMessage").textContent=err.message;
 }
};

$("logoutButton").onclick=()=>{
 token="";
 localStorage.removeItem("hds_admin_token");
 showLogin();
};

$("refreshOrders").onclick=refresh;

async function refresh(){
 try{
  const [d,orders]=await Promise.all([
   request("/api/admin/dashboard"),
   request("/api/admin/orders")
  ]);

  $("stats").innerHTML=[
   ["Total orders",d.total_orders],
   ["Paid orders",d.paid_orders],
   ["Awaiting payment",d.pending_orders],
   ["NGN revenue",money(d.revenue_ngn,"NGN")],
   ["USD revenue",money(d.revenue_usd,"USD")]
  ].map(([k,v])=>`
   <div class="stat-card">
    <span>${k}</span>
    <strong>${v}</strong>
   </div>
  `).join("");

  $("ordersBody").innerHTML=orders.map(o=>`
   <tr>
    <td>${safe(o.reference)}</td>
    <td>${safe(o.customer_name)}<br>${safe(o.email)}<br>${safe(o.phone)}</td>
    <td>${safe(o.service?.name||"Service")}</td>
    <td>${money(o.amount,o.currency||"NGN")}</td>
    <td>${safe(o.payment_status)}</td>
    <td>${safe(o.status)}</td>
    <td>
     <select data-id="${o.id}">
      <option value="">Change status…</option>
      ${["received","in_progress","waiting_for_customer","completed","cancelled"].map(s=>`
       <option value="${s}" ${o.status===s?"selected":""}>${s.replaceAll("_"," ")}</option>
      `).join("")}
     </select>
    </td>
   </tr>
  `).join("");

  $("ordersBody").querySelectorAll("select").forEach(
   s=>s.onchange=()=>updateStatus(s)
  );

  $("adminMessage").textContent="";
 }catch(e){
  $("adminMessage").textContent=e.message;
  if(/session|token|authentication|expired/i.test(e.message)){
   token="";
   localStorage.removeItem("hds_admin_token");
   showLogin();
  }
 }
}

async function updateStatus(s){
 if(!s.value)return;

 try{
  await request("/api/admin/orders/"+s.dataset.id,{
   method:"PATCH",
   body:JSON.stringify({status:s.value})
  });
  $("adminMessage").textContent="Order status updated.";
  refresh();
 }catch(e){
  $("adminMessage").textContent=e.message;
 }
}

function safe(v){
 return String(v??"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
 }[c]));
}

if(token)showDashboard();
else showLogin();
