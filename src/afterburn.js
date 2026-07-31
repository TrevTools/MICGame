(() => {
  const Skyline = window.Skyline;
  const { clamp, circleHit, showStatus, hideStatus, updateHud } = Skyline.common;
  const state = Skyline.state;

  function spawnAfterburnEnemy(laneBias = Math.random(), depthBias = Math.random(), seeded = false) {
    const afterburn = state.afterburn;
    const laneWidth = state.width * 0.12;
    const laneCenter = state.width * (0.22 + laneBias * 0.56);
    const offset = (Math.random() - 0.5) * laneWidth * 1.4;
    const speedBase = 120 + afterburn.stage * 22 + depthBias * 160;
    afterburn.enemies.push({
      x: laneCenter + offset,
      y: -60 - Math.random() * 220,
      vx: (Math.random() - 0.5) * (35 + afterburn.stage * 4),
      vy: speedBase,
      radius: seeded ? 18 : 20 + Math.random() * 8,
      weave: Math.random() * Math.PI * 2,
      hp: seeded ? 1 : 1 + Math.floor(Math.random() * (afterburn.stage > 3 ? 2 : 1)),
      color: seeded ? "#78e6ff" : ["#ff8f3d", "#ff5b5b", "#8be36f"][Math.floor(Math.random() * 3)]
    });
  }

  function spawnOpeningWave() {
    for (let i = 0; i < 4; i += 1) {
      spawnAfterburnEnemy(0.18 + i * 0.18, 0.2 + i * 0.11, true);
    }
  }

  function resetAfterburn() {
    const afterburn = state.afterburn;
    afterburn.running = true;
    afterburn.gameOver = false;
    afterburn.score = 0;
    afterburn.lives = 3;
    afterburn.stage = 1;
    afterburn.spawnTimer = 0;
    afterburn.shotCooldown = 0;
    afterburn.shake = 0;
    afterburn.flash = 0;
    afterburn.distance = 0;
    afterburn.enemies = [];
    afterburn.shots = [];
    afterburn.explosions = [];
    afterburn.player = {
      x: state.width * 0.5,
      y: state.height * 0.72,
      vx: 0,
      vy: 0,
      angle: 0,
      boost: false,
      invuln: 0
    };
    hideStatus();
    updateHud();
    spawnOpeningWave();
  }

  function fireAfterburnShot() {
    const afterburn = state.afterburn;
    if (afterburn.shotCooldown > 0 || !afterburn.running || !afterburn.player) {
      return;
    }
    afterburn.shotCooldown = afterburn.player.boost ? 0.1 : 0.16;
    afterburn.shots.push({
      x: afterburn.player.x,
      y: afterburn.player.y - 34,
      vy: -780,
      radius: 5
    });
    afterburn.flash = 0.08;
  }

  function explodeAfterburn(x, y, color = "#ff8f3d", power = 1) {
    const afterburn = state.afterburn;
    const amount = 10 + Math.floor(14 * power);
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * (220 * power);
      afterburn.explosions.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.35,
        color
      });
    }
    afterburn.shake = Math.min(0.35, afterburn.shake + 0.12 * power);
  }

  function updateAfterburnPlayer(dt) {
    const afterburn = state.afterburn;
    const thrust = Skyline.keys.has("Shift") ? 1.55 : 1;
    afterburn.player.boost = Skyline.keys.has("Shift");
    const accel = 920 * thrust;
    let ax = 0;
    let ay = 0;

    if (Skyline.keys.has("ArrowLeft") || Skyline.keys.has("a") || Skyline.keys.has("A")) {
      ax -= accel;
    }
    if (Skyline.keys.has("ArrowRight") || Skyline.keys.has("d") || Skyline.keys.has("D")) {
      ax += accel;
    }
    if (Skyline.keys.has("ArrowUp") || Skyline.keys.has("w") || Skyline.keys.has("W")) {
      ay -= accel;
    }
    if (Skyline.keys.has("ArrowDown") || Skyline.keys.has("s") || Skyline.keys.has("S")) {
      ay += accel;
    }

    afterburn.player.vx += ax * dt;
    afterburn.player.vy += ay * dt;
    afterburn.player.vx *= Math.pow(0.83, dt * 60);
    afterburn.player.vy *= Math.pow(0.83, dt * 60);
    afterburn.player.x += afterburn.player.vx * dt;
    afterburn.player.y += afterburn.player.vy * dt;

    const minX = state.width * 0.1;
    const maxX = state.width * 0.9;
    const minY = state.horizon + 60;
    const maxY = state.height - 58;

    if (afterburn.player.x < minX) {
      afterburn.player.x = minX;
      afterburn.player.vx *= -0.45;
    }
    if (afterburn.player.x > maxX) {
      afterburn.player.x = maxX;
      afterburn.player.vx *= -0.45;
    }
    if (afterburn.player.y < minY) {
      afterburn.player.y = minY;
      afterburn.player.vy *= -0.35;
    }
    if (afterburn.player.y > maxY) {
      afterburn.player.y = maxY;
      afterburn.player.vy *= -0.35;
    }

    afterburn.player.angle = clamp(afterburn.player.vx / 700, -0.45, 0.45);
    if (afterburn.player.invuln > 0) {
      afterburn.player.invuln -= dt;
    }
  }

  function updateAfterburn(dt) {
    const afterburn = state.afterburn;
    if (!afterburn.running) {
      return;
    }

    afterburn.distance += dt * (240 + afterburn.stage * 18 + (afterburn.player && afterburn.player.boost ? 90 : 0));
    if (afterburn.distance > afterburn.stage * 1600) {
      afterburn.stage += 1;
      afterburn.distance = 0;
      showStatus("STAGE CLEAR", `Sector ${afterburn.stage}`, "Enemy patrols are getting heavier.");
      setTimeout(() => {
        if (afterburn.running && !afterburn.gameOver && state.activeMode === "afterburn") {
          hideStatus();
        }
      }, 1000);
      updateHud();
    }

    afterburn.shotCooldown = Math.max(0, afterburn.shotCooldown - dt);
    afterburn.spawnTimer -= dt;
    afterburn.shake = Math.max(0, afterburn.shake - dt * 1.6);
    afterburn.flash = Math.max(0, afterburn.flash - dt);

    if (Skyline.keys.has(" ")) {
      fireAfterburnShot();
    }

    updateAfterburnPlayer(dt);

    if (afterburn.spawnTimer <= 0) {
      const spacing = Math.max(0.28, 0.9 - afterburn.stage * 0.05);
      afterburn.spawnTimer = spacing + Math.random() * 0.6;
      spawnAfterburnEnemy();
      if (afterburn.stage >= 3 && Math.random() > 0.45) {
        spawnAfterburnEnemy(Math.random(), Math.random());
      }
    }

    for (const star of state.stars) {
      star.y += dt * star.speed * (0.1 + afterburn.stage * 0.02);
      if (star.y > 1) {
        star.y -= 1;
        star.x = Math.random();
      }
    }

    for (const shot of afterburn.shots) {
      shot.y += shot.vy * dt;
    }
    afterburn.shots = afterburn.shots.filter((shot) => shot.y > -40);

    for (const enemy of afterburn.enemies) {
      enemy.weave += dt * (1.5 + afterburn.stage * 0.2);
      enemy.x += enemy.vx * dt + Math.sin(enemy.weave) * 46 * dt;
      enemy.y += enemy.vy * dt;
      enemy.x = clamp(enemy.x, state.width * 0.08, state.width * 0.92);
    }
    afterburn.enemies = afterburn.enemies.filter((enemy) => enemy.y < state.height + 120 && enemy.hp > 0);

    for (const shot of afterburn.shots) {
      for (const enemy of afterburn.enemies) {
        if (enemy.hp <= 0) {
          continue;
        }
        const target = { x: enemy.x, y: enemy.y, radius: enemy.radius };
        if (circleHit(shot, target)) {
          shot.y = -999;
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            explodeAfterburn(enemy.x, enemy.y, enemy.color, 1);
            afterburn.score += 120;
          } else {
            explodeAfterburn(enemy.x, enemy.y, "#ffffff", 0.4);
            afterburn.score += 40;
          }
          updateHud();
          break;
        }
      }
    }

    afterburn.shots = afterburn.shots.filter((shot) => shot.y > -200);

    if (afterburn.player.invuln <= 0) {
      for (const enemy of afterburn.enemies) {
        const playerCircle = { x: afterburn.player.x, y: afterburn.player.y, radius: 24 };
        const enemyCircle = { x: enemy.x, y: enemy.y, radius: enemy.radius };
        if (circleHit(playerCircle, enemyCircle) || (enemy.y > state.height - 48 && Math.abs(enemy.x - afterburn.player.x) < 34)) {
          enemy.hp = 0;
          explodeAfterburn(afterburn.player.x, afterburn.player.y, "#56d7ff", 1.1);
          afterburn.lives -= 1;
          afterburn.player.invuln = 1.4;
          afterburn.shake = 0.35;
          updateHud();
          if (afterburn.lives <= 0) {
            Skyline.endCurrentMode("MISSION FAILED", "Game Over", "Press Enter to launch again.");
          }
          break;
        }
      }
    }

    for (const boom of afterburn.explosions) {
      boom.x += boom.vx * dt;
      boom.y += boom.vy * dt;
      boom.vx *= Math.pow(0.88, dt * 60);
      boom.vy *= Math.pow(0.88, dt * 60);
      boom.life -= dt;
    }
    afterburn.explosions = afterburn.explosions.filter((boom) => boom.life > 0);
  }

  function drawAfterburnScene() {
    const ctx = Skyline.ctx;
    const afterburn = state.afterburn;
    const shakeX = (Math.random() - 0.5) * afterburn.shake * 10;
    const shakeY = (Math.random() - 0.5) * afterburn.shake * 8;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const sky = ctx.createLinearGradient(0, 0, 0, state.horizon + 40);
    sky.addColorStop(0, "#07111f");
    sky.addColorStop(0.55, "#0b1629");
    sky.addColorStop(1, "#13263c");
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, state.width + 40, state.horizon + 80);

    const glow = ctx.createRadialGradient(state.width * 0.52, state.horizon * 0.5, 20, state.width * 0.5, state.horizon * 0.45, state.width * 0.6);
    glow.addColorStop(0, "rgba(86, 215, 255, 0.12)");
    glow.addColorStop(1, "rgba(86, 215, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, state.width, state.horizon + 40);

    ctx.fillStyle = "#020307";
    ctx.beginPath();
    ctx.moveTo(0, state.horizon + 40);
    const ridgeCount = 14;
    for (let i = 0; i <= ridgeCount; i += 1) {
      const t = i / ridgeCount;
      const x = t * state.width;
      const height = 52 + Math.sin(t * 8 + afterburn.distance * 0.001) * 18 + Math.cos(t * 4 + afterburn.stage) * 12;
      ctx.lineTo(x, state.horizon + 40 - height);
    }
    ctx.lineTo(state.width, state.height);
    ctx.lineTo(0, state.height);
    ctx.closePath();
    ctx.fill();

    const roadTop = state.horizon + 48;
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, roadTop, state.width, state.height - roadTop);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 1;
    const laneCount = 10;
    for (let i = 0; i <= laneCount; i += 1) {
      const t = i / laneCount;
      const topX = state.width * 0.5 + (t - 0.5) * state.width * 0.2;
      const bottomX = state.width * 0.5 + (t - 0.5) * state.width * 1.05;
      ctx.beginPath();
      ctx.moveTo(topX, roadTop + 4);
      ctx.lineTo(bottomX, state.height);
      ctx.stroke();
    }

    const bandCount = 18;
    for (let i = 0; i < bandCount; i += 1) {
      const t = ((afterburn.distance * 0.003 + i / bandCount) % 1) * 0.95 + 0.05;
      const y = roadTop + t * (state.height - roadTop);
      ctx.strokeStyle = `rgba(255, 143, 61, ${0.18 + t * 0.35})`;
      ctx.lineWidth = 1 + t * 2.5;
      ctx.beginPath();
      ctx.moveTo(state.width * 0.15, y);
      ctx.lineTo(state.width * 0.85, y);
      ctx.stroke();
    }

    for (const enemy of afterburn.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.weave) * 0.18);
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius * 1.35);
      ctx.lineTo(enemy.radius * 1.05, enemy.radius * 0.9);
      ctx.lineTo(0, enemy.radius * 0.2);
      ctx.lineTo(-enemy.radius * 1.05, enemy.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
      ctx.beginPath();
      ctx.ellipse(0, -enemy.radius * 0.15, enemy.radius * 0.22, enemy.radius * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const shot of afterburn.shots) {
      const gradient = ctx.createLinearGradient(shot.x, shot.y - 14, shot.x, shot.y + 10);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.35, "rgba(86, 215, 255, 0.95)");
      gradient.addColorStop(1, "rgba(255, 143, 61, 0.1)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y + 16);
      ctx.lineTo(shot.x, shot.y - 20);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const boom of afterburn.explosions) {
      const alpha = Math.max(0, boom.life / 0.8);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = boom.color;
      ctx.beginPath();
      ctx.arc(boom.x, boom.y, 2.5 + (1 - alpha) * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(boom.x, boom.y, 1.5 + (1 - alpha) * 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const player = afterburn.player;
    if (player) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      if (player.invuln > 0) {
        ctx.globalAlpha = 0.45 + Math.sin(player.invuln * 30) * 0.15;
      }

      ctx.fillStyle = "#9ae4ff";
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(16, 18);
      ctx.lineTo(0, 10);
      ctx.lineTo(-16, 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff8f3d";
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(9, 6);
      ctx.lineTo(0, 2);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (player.boost) {
        const flame = ctx.createLinearGradient(0, 18, 0, 56);
        flame.addColorStop(0, "rgba(255, 214, 92, 0.95)");
        flame.addColorStop(0.5, "rgba(255, 143, 61, 0.8)");
        flame.addColorStop(1, "rgba(255, 81, 81, 0)");
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(9, 56);
        ctx.lineTo(0, 44);
        ctx.lineTo(-9, 56);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    const frame = ctx.createLinearGradient(0, 0, 0, state.height);
    frame.addColorStop(0, "rgba(255, 255, 255, 0.03)");
    frame.addColorStop(0.75, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.strokeStyle = "rgba(86, 215, 255, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(state.width * 0.5, state.height * 0.82, state.width * 0.32, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 143, 61, 0.22)";
    ctx.beginPath();
    ctx.arc(state.width * 0.5, state.height * 0.9, state.width * 0.44, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();

    if (afterburn.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${afterburn.flash * 0.45})`;
      ctx.fillRect(0, 0, state.width, state.height);
    }

    ctx.restore();
  }

  Skyline.afterburn = {
    resetAfterburn,
    spawnAfterburnEnemy,
    spawnOpeningWave,
    fireAfterburnShot,
    explodeAfterburn,
    updateAfterburn,
    drawAfterburnScene
  };
})();
