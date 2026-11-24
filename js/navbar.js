/* ==========================================================================
   Navbar — Heritage Flow
   - Il pulsante menu apre e chiude il menu: aggiunge/toglie .navbar--open
     sull'header. Aperto, il contenitore del menu si allarga e si allunga
     mostrando le sue voci (Info, About) una sotto l'altra
     (stili in css/style.css).
   - Mobile: in cima al menu vengono copiate le voci della navbar, che nella
     barra non si vedono (classe .navbar__menu-item--mobile).
   - Click su una voce: il menu si chiude e la voce cliccata diventa la
     corrente con un'animazione, poi si apre la pagina.
   - Esc o un click fuori dal menu lo chiudono.
   ========================================================================== */

(function () {
  "use strict";

  var navbar = document.querySelector(".navbar");
  var button = navbar && navbar.querySelector(".navbar__menu");
  if (!button) return;

  var menuBox = navbar.querySelector(".navbar__menu-box");
  var menuLinks = navbar.querySelector(".navbar__dropdown-links");
  var items = navbar.querySelectorAll(".navbar__item");
  var initialCurrent = navbar.querySelector('.navbar__item[aria-current="page"]');
  var navigating = false;

  /* ------------------------------------------------------------------------
     Copie delle voci della navbar in cima al menu (visibili solo su mobile)
     ------------------------------------------------------------------------ */
  var mobileItems = [];
  if (menuLinks) {
    var first = menuLinks.firstElementChild;
    items.forEach(function (item) {
      var copy = document.createElement("a");
      copy.className = "navbar__menu-item navbar__menu-item--mobile text-menu";
      copy.href = item.getAttribute("href");
      copy.innerHTML = item.innerHTML;
      if (item.getAttribute("aria-current") === "page") {
        copy.setAttribute("aria-current", "page");
      }
      menuLinks.insertBefore(copy, first);
      mobileItems.push(copy);
    });
  }

  /* ------------------------------------------------------------------------
     Apertura / chiusura
     ------------------------------------------------------------------------ */
  function isOpen() {
    return navbar.classList.contains("navbar--open");
  }

  function setOpen(open) {
    navbar.classList.toggle("navbar--open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
  }

  button.addEventListener("click", function () {
    setOpen(!isOpen());
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      button.focus();
    }
  });

  // Click fuori dal menu: si chiude
  document.addEventListener("click", function (event) {
    if (isOpen() && menuBox && !menuBox.contains(event.target)) {
      setOpen(false);
    }
  });

  /* ------------------------------------------------------------------------
     Click su una voce: il menu si chiude e, se è una voce della navbar, la
     voce cliccata diventa la corrente (desktop: si espande con il pallino e
     quella di prima si comprime). Finita l'animazione si apre la pagina.
     ------------------------------------------------------------------------ */
  function setCurrent(index) {
    [items, mobileItems].forEach(function (list) {
      Array.prototype.forEach.call(list, function (el, i) {
        if (i === index) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });
    });
  }

  // Durata della transizione, letta dalla variabile CSS --navbar-duration
  function transitionDuration() {
    var value = getComputedStyle(navbar).getPropertyValue("--navbar-duration").trim();
    var ms = parseFloat(value) || 0;
    return /ms$/.test(value) ? ms : ms * 1000;
  }

  // index: posizione tra le voci della navbar (-1 per Info, About, …)
  function onItemClick(item, index, event) {
    // Ctrl/Cmd/Shift-click, click centrale o link interno: comportamento normale
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        item.getAttribute("href").charAt(0) === "#") {
      return;
    }

    // Voce già corrente: dal menu basta chiuderlo
    if (item.getAttribute("aria-current") === "page") {
      if (item.classList.contains("navbar__menu-item")) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }

    event.preventDefault();
    if (navigating) return;
    navigating = true;

    setOpen(false);
    if (index >= 0) setCurrent(index);

    var href = item.href;
    setTimeout(function () {
      window.location.href = href;
    }, transitionDuration() + 50);
  }

  [items, mobileItems].forEach(function (list) {
    Array.prototype.forEach.call(list, function (item, index) {
      item.addEventListener("click", function (event) {
        onItemClick(item, index, event);
      });
    });
  });

  if (menuLinks) {
    menuLinks.querySelectorAll(".navbar__menu-item:not(.navbar__menu-item--mobile)")
      .forEach(function (item) {
        item.addEventListener("click", function (event) {
          onItemClick(item, -1, event);
        });
      });
  }

  // Tornando indietro (pagina ripresa dalla cache del browser) si ripristina
  // lo stato iniziale
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    navigating = false;
    setOpen(false);
    setCurrent(Array.prototype.indexOf.call(items, initialCurrent));
  });
})();
