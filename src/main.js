(() => {
  const Skyline = window.Skyline;
  const { bindDom, buildIntelLists, buildWeaponButtons, renderModeUi, updateHud, resizeCanvas, showStatus, hideStatus } = Skyline.common;
  const state = Skyline.state;

  function startMode(mode) {
    state.activeMode = mode;
    state.screen = "play";
    state.lastTime = 0;
    Skyline.dom.coverScreen.classList.add("hidden");
    Skyline.dom.radarHud.classList.toggle("hidden", mode !== "radar");
    document.body.classList.toggle("radar-mode", mode === "radar");
    renderModeUi();

    if (mode === "afterburn") {
      Skyline.afterburn.resetAfterburn();
    } else {
      Skyline.radar.resetRadar();
    }

    updateHud();
  }

  function restartCurrentMode() {
    startMode(state.activeMode);
  }

  function showCover() {
    state.screen = "cover";
    state.lastTime = 0;
    Skyline.dom.coverScreen.classList.remove("hidden");
    Skyline.dom.radarHud.classList.add("hidden");
    document.body.classList.remove("radar-mode");
    hideStatus();
    renderModeUi();
    updateHud();
  }

  function endCurrentMode(kicker, title, text) {
    if (state.activeMode === "afterburn") {
      state.afterburn.running = false;
      state.afterburn.gameOver = true;
    } else {
      state.radar.running = false;
      state.radar.gameOver = true;
    }
    showStatus(kicker, title, text);
  }

  function drawBaseBackground() {
    const ctx = Skyline.ctx;
    ctx.clearRect(0, 0, state.width, state.height);
    const background = ctx.createLinearGradient(0, 0, 0, state.height);
    background.addColorStop(0, "#07111f");
    background.addColorStop(1, "#05070d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (const star of state.stars) {
      const x = star.x * state.width;
      const y = star.y * (state.horizon * 0.9);
      const size = 1 + star.z * 1.6;
      ctx.globalAlpha = 0.25 + star.z * 0.7;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    if (state.screen === "cover") {
      drawBaseBackground();
      return;
    }

    if (state.activeMode === "afterburn") {
      Skyline.afterburn.drawAfterburnScene();
    } else {
      Skyline.radar.drawRadarBackground();
    }
  }

  function update(dt) {
    if (state.activeMode === "afterburn") {
      Skyline.afterburn.updateAfterburn(dt);
    } else {
      Skyline.radar.updateRadar(dt);
    }
  }

  function loop(time) {
    const delta = Math.min(0.033, (time - state.lastTime) / 1000 || 0);
    state.lastTime = time;
    if (state.screen === "cover") {
      drawBaseBackground();
    } else {
      update(delta);
      render();
    }
    if (state.screen === "cover") {
      render();
    }
    requestAnimationFrame(loop);
  }

  bindDom();
  buildIntelLists();
  buildWeaponButtons();
  Skyline.common.selectWeaponSlot(state.radar.selectedWeaponSlot);
  resizeCanvas();
  renderModeUi();
  updateHud();
  showCover();

  Skyline.dom.launchArcade.addEventListener("click", () => startMode("afterburn"));
  Skyline.dom.launchRadar.addEventListener("click", () => startMode("radar"));

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", (event) => {
    Skyline.keys.add(event.key);

    if (event.key === "Enter") {
      if (state.screen === "cover") {
        startMode(state.activeMode);
      } else if (state.afterburn.gameOver || state.radar.gameOver) {
        restartCurrentMode();
      }
    }

    if (event.key === " ") {
      event.preventDefault();
      if (state.screen !== "cover") {
        if (state.activeMode === "afterburn") {
          Skyline.afterburn.fireAfterburnShot();
        } else {
          Skyline.radar.deployRadarDefense();
        }
      }
    }

    if (state.activeMode === "radar" && state.screen === "play") {
      const digit = Number.parseInt(event.key, 10);
      if (digit >= 1 && digit <= Skyline.weaponSlots.length) {
        Skyline.common.selectWeaponSlot(digit - 1);
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    Skyline.keys.delete(event.key);
  });

  Skyline.startMode = startMode;
  Skyline.restartCurrentMode = restartCurrentMode;
  Skyline.showCover = showCover;
  Skyline.endCurrentMode = endCurrentMode;
  Skyline.drawBaseBackground = drawBaseBackground;
  Skyline.loop = loop;

  requestAnimationFrame(loop);
})();
