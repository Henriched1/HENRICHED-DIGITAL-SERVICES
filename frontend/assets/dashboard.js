(() => {
  const main = document.querySelector("main");
  if (!main) return;

  const groups = {
    overview: [".hero", ".trust-strip"],
    services: ["#services", "#process"],
    portfolio: ["#hds-portfolio"],
    store: ["#hds-shop"],
    tracking: ["#hds-track"],
    about: ["#about", ".hds-trust"],
    contact: ["#contact"]
  };

  const pages = {
    overview: "/", services: "/services",
    portfolio: "/portfolio", store: "/store",
    tracking: "/track-order", about: "/about",
    contact: "/contact"
  };

  const labels = [
    ["overview","Overview","⌂"],
    ["services","Our services","▦"],
    ["portfolio","Portfolio","▧"],
    ["store","Store demo","◇"],
    ["tracking","Track an order","◎"],
    ["about","About us","ⓘ"],
    ["contact","Contact","✉"]
  ];

  const subtitles = {
    overview:"Your digital growth workspace.",
    services:"Explore services and choose what your business needs.",
    portfolio:"Explore illustrative concepts and creative capabilities.",
    store:"See how products can be presented in an online store.",
    tracking:"Check the progress of an existing customer order.",
    about:"Learn about our approach to digital solutions.",
    contact:"Let's discuss your next project."
  };

  const elements = {};
  Object.entries(groups).forEach(([key, selectors]) => {
    elements[key] = selectors.map(s => main.querySelector(s)).filter(Boolean);
  });

  const sidebar = document.createElement("aside");
  sidebar.className = "dashboard-sidebar";
  sidebar.innerHTML = `
    <div class="dashboard-side-brand">
      <span class="brand-mark">H</span>
      <span>HENRICHED<small>DIGITAL SERVICES</small></span>
    </div>
    <div class="dashboard-nav-label">WORKSPACE</div>
    <nav class="dashboard-nav" aria-label="Dashboard navigation">
      ${labels.map(([key,label,icon]) => `
        <a href="${pages[key]}" data-page="${key}" class="dashboard-nav-item">
          <span>${icon}</span>${label}
        </a>`).join("")}
    </nav>
    <div class="dashboard-side-bottom">
      <a href="/admin">Private admin workspace ↗</a>
      <small>Creative solutions. Professional delivery.</small>
    </div>`;

  const workspace = document.createElement("div");
  workspace.className = "dashboard-workspace";
  workspace.innerHTML = `
    <div class="dashboard-heading">
      <div>
        <span class="eyebrow">HENRICHED DIGITAL SERVICES</span>
        <h1 id="dashboardPageTitle"></h1>
        <p id="dashboardPageSubtitle"></p>
      </div>
      <span class="dashboard-status"><i></i> Available for projects</span>
    </div>
    <div class="dashboard-quick-stats">
      <div><span>OUR OFFER</span><strong>Digital services</strong><small>Solutions for your business</small></div>
      <div><span>OUR APPROACH</span><strong>Built around you</strong><small>Clear scope and communication</small></div>
      <div><span>YOUR ORDERS</span><strong>Track progress</strong><small>Check an existing project</small></div>
    </div>
    <div class="dashboard-views"></div>`;

  const views = workspace.querySelector(".dashboard-views");

  Object.entries(elements).forEach(([key,nodes]) => {
    const view = document.createElement("div");
    view.className = "dashboard-view";
    view.dataset.view = key;
    nodes.forEach(node => view.appendChild(node));
    views.appendChild(view);
  });

  main.className = "dashboard-layout";
  main.replaceChildren(sidebar,workspace);

  const mobileDock = document.createElement("nav");
  mobileDock.className = "mobile-dashboard-dock";
  mobileDock.setAttribute("aria-label","Quick dashboard navigation");
  mobileDock.innerHTML = `
    <a href="/" data-dock="overview"><span>⌂</span><small>Dashboard</small></a>
    <a href="/services" data-dock="services"><span>▦</span><small>Services</small></a>
    <a href="/store" data-dock="store"><span>◇</span><small>Store</small></a>
    <a href="/track-order" data-dock="tracking"><span>◎</span><small>Track</small></a>
    <button type="button" data-dock-more><span>☰</span><small>More</small></button>
  `;
  mobileDock.querySelectorAll("[data-dock]").forEach(link => {
    if (link.dataset.dock === key) link.classList.add("active");
  });
  mobileDock.querySelector("[data-dock-more]").addEventListener("click", () => {
    sidebar.classList.toggle("mobile-open");
  });
  document.body.appendChild(mobileDock);

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const key = Object.keys(pages).find(k => pages[k] === path) || "overview";

  views.querySelectorAll(".dashboard-view").forEach(view => {
    view.hidden = view.dataset.view !== key;
  });

  sidebar.querySelectorAll("[data-page]").forEach(link => {
    const active = link.dataset.page === key;
    link.classList.toggle("active",active);
    if (active) link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });

  document.getElementById("dashboardPageTitle").textContent =
    labels.find(x => x[0] === key)[1];

  document.getElementById("dashboardPageSubtitle").textContent =
    subtitles[key];

  if (key !== "overview") {
    workspace.querySelector(".dashboard-quick-stats").hidden = true;
  }

  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute("href").slice(1);
    const target = {
      services:"/services",
      process:"/services",
      "hds-portfolio":"/portfolio",
      "hds-shop":"/store",
      "hds-track":"/track-order",
      about:"/about",
      contact:"/contact"
    }[id];

    if (target) {
      event.preventDefault();
      window.location.assign(target);
    }
  });

  const menu = document.getElementById("menuToggle");
  if (menu) {
    menu.setAttribute("aria-label","Toggle dashboard menu");
    menu.onclick = () => sidebar.classList.toggle("mobile-open");
  }

  document.title =
    labels.find(x => x[0] === key)[1] +
    " | Henriched Digital Services";

  window.scrollTo(0,0);
})();
