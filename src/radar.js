(() => {
  const Skyline = window.Skyline;
  const { clamp, showStatus, hideStatus, updateHud } = Skyline.common;
  const state = Skyline.state;

  function resetRadar() {
    const radar = state.radar;
    radar.running = true;
    radar.gameOver = false;
    radar.score = 0;
    radar.shield = 5;
    radar.wave = 1;
    radar.spawnTimer = 0;
    radar.spawnRemaining = 0;
    radar.cooldown = 0;
    radar.selectedWeaponSlot = 0;
    radar.selectedDefenseId = "laser";
    radar.attacks = [];
    radar.explosions = [];
    radar.scan = 0;
    radar.alert = "Hold the line. Incoming signatures are being painted.";
    radar.waveClearTimer = 0;
    radar.flash = 0;
    Skyline.common.selectWeaponSlot(radar.selectedWeaponSlot);
    hideStatus();
    updateHud();
    prepareRadarWave();
  }

  function prepareRadarWave() {
    const radar = state.radar;
    radar.spawnRemaining = 4 + radar.wave * 2;
    radar.spawnTimer = 0.25;
    radar.attacks = [];
    radar.waveClearTimer = 0;
    radar.alert = `Wave ${radar.wave} detected. Match weapons to threats.`;
    updateHud();
  }

  function spawnRadarAttack() {
    const radar = state.radar;
    const attackPool = radar.wave < 2 ? ["drone", "missile"] : radar.wave < 4 ? ["drone", "missile", "jammer"] : ["drone", "missile", "jammer", "bomber"];
    const attackId = attackPool[Math.floor(Math.random() * attackPool.length)];
    const definition = Skyline.common.getAttackDefinition(attackId);
    radar.attacks.push({
      id: `${Date.now()}-${Math.random()}`,
      typeId: definition.id,
      name: definition.name,
      color: definition.color,
      range: 1.15 + Math.random() * 0.45,
      angle: Math.random() * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.1 + radar.wave * 0.012,
      strength: definition.id === "bomber" ? 2 : 1,
      signature: definition.threat
    });
  }

  function explodeRadar(x, y, color = "#56d7ff", power = 1) {
    const radar = state.radar;
    const amount = 8 + Math.floor(10 * power);
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * (180 * power);
      radar.explosions.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.3,
        color
      });
    }
    radar.flash = Math.min(0.22, radar.flash + 0.08 * power);
  }

  function deployRadarDefense() {
    const radar = state.radar;
    if (!radar.running || radar.cooldown > 0) {
      return;
    }

    radar.cooldown = 0.22;
    const defense = radar.selectedDefenseId ? Skyline.common.getDefenseDefinition(radar.selectedDefenseId) : null;
    if (!defense) {
      radar.alert = "No weapon equipped in this slot.";
      radar.flash = 0.05;
      return;
    }
    const targetIndex = radar.attacks.findIndex((attack) => attack.range <= 0.72 && defense.effectiveAgainst.includes(attack.typeId));

    if (targetIndex === -1) {
      radar.alert = `${defense.name} found no valid target.`;
      radar.flash = 0.05;
      return;
    }

    const target = radar.attacks[targetIndex];
    radar.attacks.splice(targetIndex, 1);
    radar.score += target.typeId === "bomber" ? 150 : 100;
    radar.alert = `${defense.name} intercepted ${target.name}.`;
    explodeRadar(target.range * 10, target.angle, defense.color, 1);
    updateHud();
  }

  function updateRadar(dt) {
    const radar = state.radar;
    if (!radar.running) {
      return;
    }

    radar.scan += dt * 1.3;
    radar.cooldown = Math.max(0, radar.cooldown - dt);
    radar.flash = Math.max(0, radar.flash - dt);
    radar.spawnTimer -= dt;

    if (radar.spawnRemaining > 0 && radar.spawnTimer <= 0) {
      spawnRadarAttack();
      radar.spawnRemaining -= 1;
      radar.spawnTimer = Math.max(0.22, 0.72 - radar.wave * 0.05) + Math.random() * 0.32;
    }

    for (const star of state.stars) {
      star.y += dt * star.speed * 0.16;
      if (star.y > 1) {
        star.y -= 1;
        star.x = Math.random();
      }
    }

    for (const attack of radar.attacks) {
      attack.range -= dt * attack.speed;
    }

    const missedAttacks = radar.attacks.filter((attack) => attack.range <= 0);
    if (missedAttacks.length > 0) {
      radar.attacks = radar.attacks.filter((attack) => attack.range > 0);
      for (const attack of missedAttacks) {
        radar.shield -= attack.strength;
        radar.alert = `${attack.name} struck the perimeter.`;
        explodeRadar(state.width * 0.5, state.height * 0.55, attack.color, 0.9);
        updateHud();
        if (radar.shield <= 0) {
          Skyline.endCurrentMode("BREACH CONFIRMED", "Radar lost", "Press Enter to relaunch the defense.");
          return;
        }
      }
    }

    if (radar.spawnRemaining === 0 && radar.attacks.length === 0) {
      if (radar.waveClearTimer === 0) {
        radar.waveClearTimer = 1.05;
        showStatus("WAVE CLEAR", `Wave ${radar.wave}`, "All contacts are neutralized. Next surge incoming.");
      } else {
        radar.waveClearTimer -= dt;
        if (radar.waveClearTimer <= 0) {
          radar.wave += 1;
          radar.score += 180;
          radar.alert = `Wave ${radar.wave} approaching.`;
          updateHud();
          hideStatus();
          prepareRadarWave();
        }
      }
    } else {
      radar.waveClearTimer = 0;
    }

    for (const boom of radar.explosions) {
      boom.x += boom.vx * dt;
      boom.y += boom.vy * dt;
      boom.vx *= Math.pow(0.88, dt * 60);
      boom.vy *= Math.pow(0.88, dt * 60);
      boom.life -= dt;
    }
    radar.explosions = radar.explosions.filter((boom) => boom.life > 0);
  }

  function drawRadarBackground() {
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

    const top = state.height * 0.08;
    const leftCenter = { x: state.width * 0.32, y: state.height * 0.54 };
    const rightCenter = { x: state.width * 0.68, y: state.height * 0.54 };
    const radius = Math.min(state.width, state.height) * 0.23;

    const paintScope = (center, label, focusLimit, accent, showShortRange) => {
      ctx.save();
      ctx.translate(center.x, center.y);

      const ring = ctx.createRadialGradient(0, 0, 18, 0, 0, radius * 1.12);
      ring.addColorStop(0, "rgba(255, 255, 255, 0.03)");
      ring.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, (radius * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
      }

      const sweepAngle = state.radar.scan % (Math.PI * 2);
      ctx.strokeStyle = `rgba(${accent}, 0.7)`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
      ctx.stroke();

      for (const attack of state.radar.attacks) {
        if (showShortRange && attack.range > focusLimit) {
          continue;
        }
        if (!showShortRange && attack.range > 1.6) {
          continue;
        }
        const normalized = clamp(attack.range / focusLimit, 0.08, 1);
        const px = Math.cos(attack.angle) * radius * normalized;
        const py = Math.sin(attack.angle) * radius * normalized;
        const type = Skyline.common.getAttackDefinition(attack.typeId);
        ctx.fillStyle = type.color;
        ctx.globalAlpha = showShortRange ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.arc(px, py, showShortRange ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();

        if (showShortRange) {
          ctx.globalAlpha = 0.82;
          ctx.fillStyle = "#ffffff";
          ctx.font = "10px Trebuchet MS, sans-serif";
          ctx.fillText(type.name.split(" ")[0].toUpperCase(), px + 8, py - 6);
        }
      }

      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${accent}, 0.95)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(${accent}, 0.95)`;
      ctx.font = "600 12px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, -radius - 18);
      ctx.fillText(showShortRange ? "SHORT RANGE" : "LONG RANGE", 0, radius + 20);
      ctx.restore();
    };

    paintScope(leftCenter, "RADAR ALPHA", 1.35, "86, 215, 255", false);
    paintScope(rightCenter, "RADAR BETA", 0.72, "255, 143, 61", true);

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.font = "600 13px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Shield ${state.radar.shield}  |  Wave ${state.radar.wave}  |  Score ${state.radar.score}`, 24, top + 8);
    ctx.fillText(state.radar.alert, 24, top + 30);

    if (state.radar.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.radar.flash * 0.35})`;
      ctx.fillRect(0, 0, state.width, state.height);
    }
  }

  Skyline.radar = {
    resetRadar,
    prepareRadarWave,
    spawnRadarAttack,
    explodeRadar,
    deployRadarDefense,
    updateRadar,
    drawRadarBackground
  };
})();
