(() => {
  const Skyline = (window.Skyline = window.Skyline || {});

  Skyline.attackTypes = [
    {
      id: "drone",
      name: "Drone Swarm",
      description: "Fast, low-altitude drones that overwhelm fixed defenses.",
      color: "#78e6ff",
      threat: "saturation"
    },
    {
      id: "missile",
      name: "Guided Missile",
      description: "High-speed seeker with a narrow but deadly lock window.",
      color: "#ff8f3d",
      threat: "speed"
    },
    {
      id: "jammer",
      name: "Signal Jammer",
      description: "Scrambles locks and masks follow-up targets.",
      color: "#8be36f",
      threat: "electronics"
    },
    {
      id: "bomber",
      name: "Armor Bomber",
      description: "Slow, heavy, and resistant to light weapons.",
      color: "#ff5b5b",
      threat: "armor"
    }
  ];

  Skyline.defenseTypes = [
    {
      id: "laser",
      name: "Laser Lance",
      description: "Precision beam that deletes fast targets.",
      color: "#56d7ff",
      effectiveAgainst: ["drone", "missile"]
    },
    {
      id: "emp",
      name: "EMP Net",
      description: "Disrupts electronic threats and soft targets.",
      color: "#8be36f",
      effectiveAgainst: ["jammer", "drone"]
    },
    {
      id: "flare",
      name: "Flare Burst",
      description: "Breaks missile locks and spoofs seeker logic.",
      color: "#ffb34d",
      effectiveAgainst: ["missile", "bomber"]
    },
    {
      id: "rail",
      name: "Rail Burst",
      description: "Heavy kinetic blast for armored intruders.",
      color: "#ff6d6d",
      effectiveAgainst: ["bomber", "drone"]
    }
  ];

  Skyline.weaponSlots = [
    {
      slotIndex: 0,
      name: Skyline.defenseTypes[0].name,
      description: Skyline.defenseTypes[0].description,
      color: Skyline.defenseTypes[0].color,
      defenseId: Skyline.defenseTypes[0].id,
      isPlaceholder: false
    },
    {
      slotIndex: 1,
      name: Skyline.defenseTypes[1].name,
      description: Skyline.defenseTypes[1].description,
      color: Skyline.defenseTypes[1].color,
      defenseId: Skyline.defenseTypes[1].id,
      isPlaceholder: false
    },
    {
      slotIndex: 2,
      name: Skyline.defenseTypes[2].name,
      description: Skyline.defenseTypes[2].description,
      color: Skyline.defenseTypes[2].color,
      defenseId: Skyline.defenseTypes[2].id,
      isPlaceholder: false
    },
    {
      slotIndex: 3,
      name: Skyline.defenseTypes[3].name,
      description: Skyline.defenseTypes[3].description,
      color: Skyline.defenseTypes[3].color,
      defenseId: Skyline.defenseTypes[3].id,
      isPlaceholder: false
    },
    {
      slotIndex: 4,
      name: "Empty Slot",
      description: "Placeholder slot for a future weapon.",
      color: "#9db0c9",
      defenseId: null,
      isPlaceholder: true
    }
  ];

  Skyline.placeholderWeaponIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Placeholder weapon icon">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#56d7ff"/>
          <stop offset="100%" stop-color="#ff8f3d"/>
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="80" height="80" rx="18" fill="#0b1220" stroke="url(#g)" stroke-width="4"/>
      <path d="M24 57 L48 22 L72 57 Z" fill="url(#g)" opacity="0.95"/>
      <circle cx="48" cy="60" r="10" fill="#eff5ff" opacity="0.95"/>
      <path d="M48 14v14M48 68v14M14 48h14M68 48h14" stroke="#9db0c9" stroke-width="4" stroke-linecap="round" opacity="0.75"/>
    </svg>
  `.trim();
  Skyline.placeholderWeaponIconDataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(Skyline.placeholderWeaponIconSvg)}`;

  Skyline.modeMeta = {
    afterburn: {
      badge: "SKYLINE AFTERBURN",
      title: "High-speed jet combat",
      score: "Score",
      lives: "Lives",
      stage: "Stage"
    },
    radar: {
      badge: "RADAR DEFENSE",
      title: "Long-range / short-range intercept",
      score: "Score",
      lives: "Shield",
      stage: "Wave"
    }
  };

  Skyline.keys = new Set();
  Skyline.state = {
    screen: "cover",
    activeMode: "afterburn",
    width: 0,
    height: 0,
    horizon: 0,
    lastTime: 0,
    stars: [],
    afterburn: {
      running: false,
      gameOver: false,
      score: 0,
      lives: 3,
      stage: 1,
      spawnTimer: 0,
      shotCooldown: 0,
      shake: 0,
      flash: 0,
      distance: 0,
      player: null,
      enemies: [],
      shots: [],
      explosions: []
    },
    radar: {
      running: false,
      gameOver: false,
      score: 0,
      shield: 5,
      wave: 1,
      spawnTimer: 0,
      spawnRemaining: 0,
      cooldown: 0,
      selectedWeaponSlot: 0,
      selectedDefenseId: "laser",
      attacks: [],
      explosions: [],
      scan: 0,
      alert: "",
      waveClearTimer: 0,
      flash: 0
    }
  };

  function bindDom() {
    const dom = {
      canvas: document.getElementById("game"),
      modeBadge: document.getElementById("modeBadge"),
      modeTitle: document.getElementById("modeTitle"),
      labelScore: document.getElementById("labelScore"),
      labelLives: document.getElementById("labelLives"),
      labelStage: document.getElementById("labelStage"),
      scoreEl: document.getElementById("score"),
      livesEl: document.getElementById("lives"),
      stageEl: document.getElementById("stage"),
      panelOneTitle: document.getElementById("panelOneTitle"),
      panelOneBody: document.getElementById("panelOneBody"),
      panelTwoTitle: document.getElementById("panelTwoTitle"),
      panelTwoBody: document.getElementById("panelTwoBody"),
      coverScreen: document.getElementById("coverScreen"),
      radarHud: document.getElementById("radarHud"),
      launchArcade: document.getElementById("launchArcade"),
      launchRadar: document.getElementById("launchRadar"),
      radarIntelList: document.getElementById("radarIntelList"),
      weaponButtons: document.getElementById("weaponButtons"),
      selectedWeaponText: document.getElementById("selectedWeaponText"),
      statusCard: document.getElementById("statusCard")
    };

    dom.statusTitle = dom.statusCard.querySelector(".status-title");
    dom.statusText = dom.statusCard.querySelector(".status-text");
    dom.statusKicker = dom.statusCard.querySelector(".status-kicker");
    Skyline.dom = dom;
    Skyline.ctx = dom.canvas.getContext("2d");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function circleHit(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radius = a.radius + b.radius;
    return dx * dx + dy * dy < radius * radius;
  }

  function ensureStars() {
    const state = Skyline.state;
    if (state.stars.length > 0) {
      return;
    }
    for (let i = 0; i < 180; i += 1) {
      state.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: 0.2 + Math.random() * 0.8,
        speed: 0.15 + Math.random() * 0.45
      });
    }
  }

  function resizeCanvas() {
    const state = Skyline.state;
    const rect = Skyline.dom.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    Skyline.dom.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    Skyline.dom.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    Skyline.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.width = rect.width;
    state.height = rect.height;
    state.horizon = rect.height * 0.33;
    ensureStars();
  }

  function getAttackDefinition(id) {
    return Skyline.attackTypes.find((attack) => attack.id === id);
  }

  function getDefenseDefinition(id) {
    return Skyline.defenseTypes.find((defense) => defense.id === id);
  }

  function effectiveDefensesForAttack(attackId) {
    return Skyline.defenseTypes.filter((defense) => defense.effectiveAgainst.includes(attackId));
  }

  function buildIntelLists() {
    const renderList = (container) => {
      container.innerHTML = Skyline.attackTypes.map((attack) => {
        const defenseNames = effectiveDefensesForAttack(attack.id).map((defense) => defense.name);
        const tags = defenseNames.map((name) => `<span class="intel-tag">${name}</span>`).join("");
        return `
          <li>
            <div class="intel-title"><strong>${attack.name}</strong><span>${attack.threat}</span></div>
            <div class="intel-meta">${attack.description}</div>
            <div class="intel-tag-row">${tags}</div>
          </li>
        `;
      }).join("");
    };

    if (Skyline.dom.radarIntelList) {
      renderList(Skyline.dom.radarIntelList);
    }
  }

  function buildWeaponButtons() {
    Skyline.dom.weaponButtons.innerHTML = Skyline.weaponSlots.map((slot) => `
      <button type="button" class="weapon-slot" data-slot-index="${slot.slotIndex}">
        <span class="weapon-slot-number">${slot.slotIndex + 1}</span>
        <span class="weapon-slot-frame">
          <img class="weapon-slot-icon" src="${Skyline.placeholderWeaponIconDataUri}" alt="${slot.name} icon" />
        </span>
        <span class="weapon-slot-name">${slot.name}</span>
        <span class="weapon-slot-meta">${slot.isPlaceholder ? "Locked" : slot.description}</span>
      </button>
    `).join("");

    Skyline.dom.weaponButtons.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectWeaponSlot(Number(button.dataset.slotIndex)));
    });
  }

  function selectWeaponSlot(slotIndex) {
    const slot = Skyline.weaponSlots[clamp(slotIndex, 0, Skyline.weaponSlots.length - 1)];
    const radar = Skyline.state.radar;
    radar.selectedWeaponSlot = slot.slotIndex;
    radar.selectedDefenseId = slot.defenseId;
    Skyline.dom.selectedWeaponText.textContent = slot.isPlaceholder
      ? `Selected slot: ${slot.name}`
      : `Selected weapon: ${slot.name}`;
    Skyline.dom.weaponButtons.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.slotIndex) === slot.slotIndex);
    });
  }

  function showStatus(kicker, title, text) {
    Skyline.dom.statusKicker.textContent = kicker;
    Skyline.dom.statusTitle.textContent = title;
    Skyline.dom.statusText.textContent = text;
    Skyline.dom.statusCard.classList.remove("hidden");
  }

  function hideStatus() {
    Skyline.dom.statusCard.classList.add("hidden");
  }

  function renderModeUi() {
    const meta = Skyline.modeMeta[Skyline.state.activeMode];
    Skyline.dom.modeBadge.textContent = meta.badge;
    Skyline.dom.modeTitle.textContent = meta.title;

    if (Skyline.state.activeMode === "afterburn") {
      Skyline.dom.panelOneTitle.textContent = "Controls";
      Skyline.dom.panelOneBody.innerHTML = `
        <p>Move with WASD or the arrow keys.</p>
        <p>Press Space to fire. Hold Shift to boost.</p>
        <p>Press Enter to start or restart.</p>
      `;
      Skyline.dom.panelTwoTitle.textContent = "Mission";
      Skyline.dom.panelTwoBody.innerHTML = `
        <p>Cut through the canyon, destroy enemy craft, and survive as long as you can.</p>
      `;
    } else {
      Skyline.dom.panelOneTitle.textContent = "Controls";
      Skyline.dom.panelOneBody.innerHTML = `
        <p>Use 1-5 or click a box to change the active slot.</p>
        <p>Press Space to deploy the selected countermeasure.</p>
        <p>Watch both radar screens and stop the attack before impact.</p>
      `;
      Skyline.dom.panelTwoTitle.textContent = "Threat Matrix";
      Skyline.dom.panelTwoBody.innerHTML = `
        <p>Long-range radar shows early contacts. Short-range radar is the final lock window.</p>
        <p>Match the selected slot to the incoming attack type for a clean intercept.</p>
      `;
    }
  }

  function updateHud() {
    const meta = Skyline.modeMeta[Skyline.state.activeMode];
    Skyline.dom.labelScore.textContent = meta.score;
    Skyline.dom.labelLives.textContent = meta.lives;
    Skyline.dom.labelStage.textContent = meta.stage;

    if (Skyline.state.activeMode === "afterburn") {
      Skyline.dom.scoreEl.textContent = String(Skyline.state.afterburn.score);
      Skyline.dom.livesEl.textContent = String(Skyline.state.afterburn.lives);
      Skyline.dom.stageEl.textContent = String(Skyline.state.afterburn.stage);
    } else {
      Skyline.dom.scoreEl.textContent = String(Skyline.state.radar.score);
      Skyline.dom.livesEl.textContent = String(Skyline.state.radar.shield);
      Skyline.dom.stageEl.textContent = String(Skyline.state.radar.wave);
    }
  }

  Skyline.common = {
    bindDom,
    clamp,
    circleHit,
    ensureStars,
    resizeCanvas,
    buildIntelLists,
    buildWeaponButtons,
    selectWeaponSlot,
    showStatus,
    hideStatus,
    renderModeUi,
    updateHud,
    getAttackDefinition,
    getDefenseDefinition,
    effectiveDefensesForAttack
  };
})();
