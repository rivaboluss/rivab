(function () {
  const data = window.RIVABOLUSS_DATA || {
    backgrounds: [],
    music: [],
    artworkCategories: [],
    profile: {},
  };

  const root = document.documentElement;
  const storageKeys = {
    theme: "rivaboluss-theme",
    background: "rivaboluss-background",
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const refreshIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
    }
  };

  const image = (src, alt, className) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    img.loading = "lazy";
    if (className) img.className = className;
    return img;
  };

  const setPressed = (buttons, activeButton) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-selected", String(button === activeButton));
    });
  };

  const setupTheme = () => {
    const saved = localStorage.getItem(storageKeys.theme);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = saved || (prefersDark ? "dark" : "light");

    const button = $(".theme-toggle");
    if (!button) return;

    const update = () => {
      const isDark = root.dataset.theme === "dark";
      const icon = $("i", button);
      const text = $("span", button);
      if (icon) icon.setAttribute("data-lucide", isDark ? "sun" : "moon");
      if (text) text.textContent = isDark ? "日光" : "夜色";
      button.setAttribute("aria-label", isDark ? "切换到日光配色" : "切换到夜色配色");
      refreshIcons();
    };

    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(storageKeys.theme, root.dataset.theme);
      update();
    });

    update();
  };

  const setupNav = () => {
    const toggle = $(".nav-toggle");
    const nav = $("#site-nav");
    if (!toggle || !nav) return;

    const close = () => {
      nav.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开导航");
      const icon = $("i", toggle);
      if (icon) icon.setAttribute("data-lucide", "menu");
      refreshIcons();
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      const icon = $("i", toggle);
      if (icon) icon.setAttribute("data-lucide", open ? "x" : "menu");
      refreshIcons();
    });

    $$("a", nav).forEach((link) => link.addEventListener("click", close));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) close();
    });
  };

  const setupScrollProgress = () => {
    const progress = $(".scroll-progress");
    if (!progress) return;

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  };

  const setupStats = () => {
    const albums = data.music.length;
    const tracks = data.music.reduce((total, album) => total + album.tracks.length, 0);
    const artworks = data.artworkCategories.reduce(
      (total, category) => total + category.items.length,
      0,
    );

    const albumCount = $("#album-count");
    const trackCount = $("#track-count");
    const artCount = $("#art-count");
    if (albumCount) albumCount.textContent = albums;
    if (trackCount) trackCount.textContent = tracks;
    if (artCount) artCount.textContent = artworks;
  };

  const setupBackgrounds = () => {
    const list = $("#background-list");
    const heroBackground = $("#site-background");
    if (!list || !heroBackground || !data.backgrounds.length) return;

    const saved = localStorage.getItem(storageKeys.background);
    const savedIndex = data.backgrounds.findIndex((item) => item.src === saved);
    let activeIndex = savedIndex >= 0 ? savedIndex : 0;

    const apply = (index) => {
      const bg = data.backgrounds[index];
      if (!bg) return;
      activeIndex = index;
      heroBackground.src = bg.src;
      heroBackground.alt = "";
      localStorage.setItem(storageKeys.background, bg.src);
      $$(".background-choice", list).forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === activeIndex);
        button.setAttribute("aria-pressed", String(buttonIndex === activeIndex));
      });
    };

    data.backgrounds.forEach((bg, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "background-choice";
      button.setAttribute("aria-label", `背景 ${bg.name}`);
      button.style.backgroundImage = `url("${bg.src}")`;
      button.addEventListener("click", () => apply(index));
      list.appendChild(button);
    });

    apply(activeIndex);
  };

  const setupLibrarySwitch = () => {
    const tabs = $$(".library-switch [data-library]");
    const panels = $$("[data-library-panel]");
    const links = $$("[data-library-link]");
    if (!tabs.length || !panels.length) return;

    const activate = (name) => {
      tabs.forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab.dataset.library === name));
      });
      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.libraryPanel === name);
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab.dataset.library));
    });

    links.forEach((link) => {
      link.addEventListener("click", () => activate(link.dataset.libraryLink));
    });

    $$('a[href="#music"], a[href="#art"]').forEach((link) => {
      link.addEventListener("click", () => {
        activate(link.getAttribute("href").slice(1));
      });
    });

    const syncFromHash = () => {
      if (location.hash === "#art" || location.hash === "#music") {
        activate(location.hash.slice(1));
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
  };

  const renderMusic = () => {
    const albumList = $("#album-list");
    const detail = $("#album-detail");
    const player = $("#player-bar");
    const audio = $("#audio-player");
    const playerCover = $("#player-cover");
    const playerAlbum = $("#player-album");
    const playerTitle = $("#player-title");
    const playerToggle = $("#player-toggle");
    const playerClose = $("#player-close");
    if (!albumList || !detail || !audio) return;

    let activeAlbumIndex = 0;
    let queue = [];

    const setPlayerCollapsed = (collapsed) => {
      if (!player) return;

      player.classList.toggle("is-collapsed", collapsed);
      if (playerToggle) {
        playerToggle.setAttribute("aria-expanded", String(!collapsed));
        playerToggle.setAttribute("aria-label", collapsed ? "展开播放器" : "折叠播放器");
        const icon = $("[data-lucide]", playerToggle);
        if (icon) icon.setAttribute("data-lucide", collapsed ? "chevron-up" : "chevron-down");
        refreshIcons();
      }
    };

    playerToggle?.addEventListener("click", () => {
      setPlayerCollapsed(!player?.classList.contains("is-collapsed"));
    });

    const playTrack = (albumIndex, trackIndex, { autoplay = true, keepQueue = false } = {}) => {
      const album = data.music[albumIndex];
      const track = album?.tracks[trackIndex];
      if (!album || !track) return;

      if (!keepQueue) queue = [];
      audio.src = track.src;
      if (playerCover) playerCover.src = album.cover;
      if (playerAlbum) playerAlbum.textContent = album.title;
      if (playerTitle) playerTitle.textContent = track.title;
      player?.classList.add("is-visible");
      setPlayerCollapsed(false);
      if (autoplay) audio.play().catch(() => {});
    };

    playerClose?.addEventListener("click", () => {
      queue = [];
      audio.pause();
      player?.classList.remove("is-visible");
    });

    audio.addEventListener("ended", () => {
      const next = queue.shift();
      if (next) playTrack(next.albumIndex, next.trackIndex, { keepQueue: true });
    });

    const startDefaultPlaylist = () => {
      const wanted = [
        ["步stepS.O.S", "步"],
        ["X.R.X-Again", "X.R.X-Again"],
      ];
      const found = wanted
        .map(([albumTitle, trackTitle]) => {
          const albumIndex = data.music.findIndex((album) => album.title === albumTitle);
          const trackIndex =
            data.music[albumIndex]?.tracks.findIndex((track) => track.title === trackTitle) ?? -1;
          return albumIndex >= 0 && trackIndex >= 0 ? { albumIndex, trackIndex } : null;
        })
        .filter(Boolean);
      if (!found.length) return;

      queue = found.slice(1);
      playTrack(found[0].albumIndex, found[0].trackIndex, { autoplay: false, keepQueue: true });

      // 浏览器通常会拦截无声交互前的自动播放，失败时等用户首次点击/按键再开始
      const beginPlayback = () => {
        if (audio.paused) audio.play().catch(() => {});
      };
      beginPlayback();
      window.addEventListener("pointerdown", beginPlayback, { once: true });
      window.addEventListener("keydown", beginPlayback, { once: true });
    };

    const renderDetail = () => {
      const album = data.music[activeAlbumIndex];
      detail.replaceChildren();
      if (!album) return;

      const header = document.createElement("div");
      header.className = "album-detail-head";
      header.appendChild(image(album.cover, `${album.title} 封面`, "album-cover-large"));

      const copy = document.createElement("div");
      copy.innerHTML = `
        <p class="eyebrow">Album</p>
        <h3>${album.title}</h3>
        <p>${album.tracks.length} 首曲目 / miragerevivalism</p>
      `;
      header.appendChild(copy);
      detail.appendChild(header);

      const list = document.createElement("div");
      list.className = "track-list";
      album.tracks.forEach((track, trackIndex) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "track-row";
        item.innerHTML = `
          <span class="track-index">${String(trackIndex + 1).padStart(2, "0")}</span>
          <span class="track-title">${track.title}</span>
          <span class="track-format">${track.format}</span>
          <i data-lucide="play"></i>
        `;
        item.addEventListener("click", () => playTrack(activeAlbumIndex, trackIndex));
        list.appendChild(item);
      });
      detail.appendChild(list);
      refreshIcons();
    };

    const renderAlbums = () => {
      albumList.replaceChildren();
      data.music.forEach((album, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "album-card";
        button.setAttribute("aria-selected", String(index === activeAlbumIndex));
        button.appendChild(image(album.cover, `${album.title} 封面`));
        const body = document.createElement("span");
        body.innerHTML = `
          <strong>${album.title}</strong>
          <small>${album.tracks.length} Tracks</small>
        `;
        button.appendChild(body);
        button.addEventListener("click", () => {
          activeAlbumIndex = index;
          setPressed($$(".album-card", albumList), button);
          renderDetail();
        });
        albumList.appendChild(button);
      });
    };

    renderAlbums();
    renderDetail();
    startDefaultPlaylist();
  };

  const renderArt = () => {
    const categoryList = $("#art-category-list");
    const gallery = $("#art-gallery");
    const lightbox = $("#art-lightbox");
    const lightboxImage = $("#lightbox-image");
    const lightboxTitle = $("#lightbox-title");
    const lightboxCount = $("#lightbox-count");
    if (!categoryList || !gallery || !lightbox || !lightboxImage) return;

    let activeCategoryIndex = 0;
    let activeArtworkIndex = 0;

    const openLightbox = (index) => {
      const category = data.artworkCategories[activeCategoryIndex];
      const item = category?.items[index];
      if (!category || !item) return;

      activeArtworkIndex = index;
      lightboxImage.src = item.src;
      lightboxImage.alt = item.title;
      if (lightboxTitle) lightboxTitle.textContent = item.title;
      if (lightboxCount) {
        lightboxCount.textContent = `${activeArtworkIndex + 1} / ${category.items.length}`;
      }
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
    };

    const closeLightbox = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
    };

    const moveLightbox = (step) => {
      const category = data.artworkCategories[activeCategoryIndex];
      if (!category) return;
      const nextIndex =
        (activeArtworkIndex + step + category.items.length) % category.items.length;
      openLightbox(nextIndex);
    };

    const renderGallery = () => {
      const category = data.artworkCategories[activeCategoryIndex];
      gallery.replaceChildren();
      if (!category) return;

      const title = document.createElement("div");
      title.className = "gallery-head";
      title.innerHTML = `
        <p class="eyebrow">${category.path}</p>
        <h3>${category.title}</h3>
        <span>${category.items.length} 张作品</span>
      `;
      gallery.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "art-grid";
      category.items.forEach((item, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "art-card";
        button.appendChild(image(item.src, item.title));
        const caption = document.createElement("span");
        caption.textContent = item.title;
        button.appendChild(caption);
        button.addEventListener("click", () => openLightbox(index));
        grid.appendChild(button);
      });
      gallery.appendChild(grid);
    };

    const renderCategories = () => {
      categoryList.replaceChildren();
      data.artworkCategories.forEach((category, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category-card";
        button.setAttribute("aria-selected", String(index === activeCategoryIndex));
        button.appendChild(image(category.cover, `${category.title} 封面`));
        const copy = document.createElement("span");
        copy.innerHTML = `
          <strong>${category.title}</strong>
          <small>${category.items.length} Works</small>
        `;
        button.appendChild(copy);
        button.addEventListener("click", () => {
          activeCategoryIndex = index;
          setPressed($$(".category-card", categoryList), button);
          renderGallery();
        });
        categoryList.appendChild(button);
      });
    };

    $(".lightbox-close")?.addEventListener("click", closeLightbox);
    $(".lightbox-prev")?.addEventListener("click", () => moveLightbox(-1));
    $(".lightbox-next")?.addEventListener("click", () => moveLightbox(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    window.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    });

    renderCategories();
    renderGallery();
  };

  const setupCopy = () => {
    $$("[data-copy]").forEach((button) => {
      const text = button.dataset.copy || "";
      const label = $("span", button);
      const original = label?.textContent || "";
      button.addEventListener("click", async () => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            const field = document.createElement("textarea");
            field.value = text;
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();
            document.execCommand("copy");
            field.remove();
          }
          if (label) label.textContent = "已复制";
        } catch (error) {
          if (label) label.textContent = "复制失败";
        }
        window.setTimeout(() => {
          if (label) label.textContent = original;
        }, 1600);
      });
    });
  };

  const setupHiddenProfile = () => {
    const button = $("[data-hidden-profile-toggle]");
    const panel = button ? $(`#${button.getAttribute("aria-controls")}`) : null;
    if (!button || !panel) return;

    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    setupTheme();
    setupNav();
    setupScrollProgress();
    setupStats();
    setupBackgrounds();
    setupLibrarySwitch();
    renderMusic();
    renderArt();
    setupCopy();
    setupHiddenProfile();
    refreshIcons();
  });
})();
