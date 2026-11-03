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

  const labels = [
    ["overview", "Overview", "⌂"],
    ["services", "Our services", "▦"],
    ["portfolio", "Portfolio", "▧"],
    ["store", "Store demo", "◇"],
    ["tracking", "Track an order", "◎"],
    ["about", "About us", "ⓘ"],
    ["contact", "Contact", "✉"]
  ];

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
      ${labels.map(([key, label, icon]) =>
        `<button type="button" data-view="${key}" class="dashboard-nav-item">
          <span>${icon}</span>${label}
        </button>`
      ).join("")}
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
        <h1 id="dashboardPageTitle">Overview</h1>
        <p id="dashboardPageSubtitle">Your digital growth workspace.</p>
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

  Object.entries(elements).forEach(([key, nodes]) => {
    const view = document.createElement("div");
    view.className = "dashboard-view";
    view.dataset.view = key;
    nodes.forEach(node => view.appendChild(node));
    views.appendChild(view);
  });

  main.className = "dashboard-layout";
  main.replaceChildren(sidebar, workspace);

  const subtitles = {
    overview: "Your digital growth workspace.",
    services: "Explore services and choose what your business needs.",
    portfolio: "Explore illustrative concepts and creative capabilities.",
    store: "See how products can be presented in an online store.",
    tracking: "Check the progress of an existing customer order.",
    about: "Learn about our approach to digital solutions.",
    contact: "Let's discuss your next project."
  };

  function showView(key) {
    if (!elements[key]) key = "overview";

    views.querySelectorAll(".dashboard-view").forEach(view => {
      view.hidden = view.dataset.view !== key;
    });

    sidebar.querySelectorAll("[data-view]").forEach(button => {
      const active = button.dataset.view === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    document.getElementById("dashboardPageTitle").textContent =
      labels.find(item => item[0] === key)[1];
    document.getElementById("dashboardPageSubtitle").textContent =
      subtitles[key];

    sidebar.classList.remove("mobile-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    history.replaceState(null, "", "#" + key);
  }

  sidebar.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");
    if (button) showView(button.dataset.view);
  });

  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = link.getAttribute("href").slice(1);
    const mapping = {
      services: "services",
      process: "services",
      "hds-portfolio": "portfolio",
      "hds-shop": "store",
      "hds-track": "tracking",
      about: "about",
      contact: "contact"
    };
    if (mapping[target]) {
      event.preventDefault();
      showView(mapping[target]);
    }
  });

  const menuButton = document.getElementById("menuToggle");
  if (menuButton) {
    menuButton.setAttribute("aria-label", "Toggle dashboard menu");
    menuButton.onclick = () => sidebar.classList.toggle("mobile-open");
  }

  const initial = location.hash.replace("#", "");
  showView(groups[initial] ? initial : ({
    "hds-portfolio": "portfolio",
    "hds-shop": "store",
    "hds-track": "tracking",
    process: "services"
  }[initial] || "overview"));
})();
