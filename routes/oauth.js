const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../model/user.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync("./Config/config.json").toString());
const functions = require('../structs/functions.js');
const discordBot = require('../DiscordBot/index.js'); // Importar el bot

const router = express.Router();

// 1. Iniciar sesión con Discord
router.get('/api/v2/discord/login', (req, res) => {
  const clientId = config.discord.client_id;
  const redirectUri = encodeURIComponent(config.discord.redirect_uri);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
  res.redirect(url);
});

// 2. Callback de Discord
router.get('/api/v2/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No se recibió código de Discord.');

  try {
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: config.discord.client_id,
      client_secret: config.discord.client_secret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.discord.redirect_uri,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    const discordUser = userResponse.data;

    // Guardar sesión en cookie (seguridad mejorada)
    res.cookie('leilos_session', discordUser.id, { 
      maxAge: 15 * 60 * 1000, 
      httpOnly: true,
      secure: true, 
      sameSite: 'lax',
      path: '/'
    });

    // Verificar roles en el servidor de Discord
    let isHighRole = false;
    try {
      const guildId = '1461855344631484612';
      const guildMemberResponse = await axios.get(`https://discord.com/api/guilds/${guildId}/members/${discordUser.id}`, {
        headers: { Authorization: `Bot ${config.discord.bot_token}` }
      });
      
      const roles = guildMemberResponse.data.roles;
      if (roles.length > 0) isHighRole = true; 
    } catch (e) {
      console.log('[Discord] El usuario no está en el servidor principal o el bot no tiene acceso.');
    }

    const email = `${discordUser.id}@leilos.tf`;

    // Buscar si el usuario ya existe y tiene los campos básicos
    let user = await User.findOne({ discordId: discordUser.id });

    if (!user || !user.username || !user.created) {
      // Si no existe o está incompleto, mostrar formulario para elegir contraseña
      return res.send(`
        <html>
          <head>
            <title>Registro Leilos | Proyecto de ${discordUser.username}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
              
              :root {
                --primary: #D4AF37;
                --primary-hover: #F5Edc3;
                --bg-dark: #050505;
                --bg-card: #0a0a0a;
                --text-main: #ffffff;
                --text-muted: #b8b8b8;
                --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
                --border: rgba(212, 175, 55, 0.2);
              }

              body { 
                font-family: 'Rajdhani', sans-serif; 
                background: var(--bg-dark); 
                color: var(--text-main); 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                margin: 0; 
                overflow-y: auto;
                overflow-x: hidden;
                position: relative;
                padding: 20px 0;
              }

              body:before {
                content: "";
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                pointer-events: none;
                z-index: -1;
              }

              * { scrollbar-width: thin; scrollbar-color: var(--primary) var(--bg-dark); }
              ::-webkit-scrollbar { width: 12px; }
              ::-webkit-scrollbar-track { background: var(--bg-dark); }
              ::-webkit-scrollbar-thumb { background-color: var(--primary); border-radius: 6px; border: 3px solid var(--bg-dark); }
              ::-webkit-scrollbar-thumb:hover { background-color: var(--primary-hover); }

              .container {
                position: relative;
                width: 100%;
                max-width: 400px;
                z-index: 1;
                padding: 20px;
                margin: auto;
              }

              .card { 
                background: var(--bg-card); 
                padding: 2.5rem; 
                border-radius: 8px; 
                border: 1px solid var(--border); 
                text-align: center; 
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                position: relative;
                overflow: hidden;
              }

              .card:after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: var(--gold-gradient);
                transform: scaleX(1);
              }

              .brand {
                font-family: 'Orbitron', sans-serif;
                font-weight: 800;
                font-size: 1.5rem;
                letter-spacing: 2px;
                color: var(--primary);
                margin-bottom: 0.5rem;
                text-transform: uppercase;
                text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
              }

              h2 { font-family: 'Orbitron', sans-serif; font-weight: 600; margin-bottom: 0.5rem; font-size: 1.2rem; text-transform: uppercase; }
              
              .info { 
                color: var(--text-muted); 
                font-size: 0.9rem; 
                margin-bottom: 2rem; 
                background: rgba(255, 255, 255, 0.03);
                padding: 8px;
                border-radius: 4px;
                display: inline-block;
                border: 1px solid var(--border);
              }

              .input-group {
                text-align: left;
                margin-bottom: 1.5rem;
              }

              label {
                display: block;
                font-size: 0.8rem;
                color: var(--text-muted);
                margin-bottom: 0.5rem;
                text-transform: uppercase;
                letter-spacing: 1px;
              }

              input { 
                width: 100%; 
                padding: 14px 18px; 
                border-radius: 4px; 
                border: 1px solid var(--border); 
                background: #050505; 
                color: white; 
                box-sizing: border-box; 
                font-family: inherit;
                font-size: 1rem;
                transition: all 0.3s ease;
              }

              input:focus {
                outline: none;
                border-color: var(--primary);
                box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
              }

              button { 
                width: 100%; 
                padding: 16px; 
                border: 2px solid var(--primary); 
                border-radius: 4px; 
                background: transparent; 
                color: var(--primary); 
                font-family: 'Orbitron', sans-serif;
                font-weight: 600; 
                font-size: 1rem;
                cursor: pointer; 
                transition: all 0.3s ease;
                margin-top: 1rem;
                text-transform: uppercase;
                position: relative;
                overflow: hidden;
                z-index: 1;
              }

              button:before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 0%;
                height: 100%;
                background: var(--primary);
                transition: width 0.3s ease;
                z-index: -1;
              }

              button:hover {
                color: var(--bg-dark);
                box-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
              }

              button:hover:before {
                width: 100%;
              }

              .high-role-badge { 
                background: var(--gold-gradient); 
                color: #000; 
                padding: 6px 14px; 
                border-radius: 4px; 
                font-size: 0.7rem; 
                display: inline-block; 
                margin-bottom: 1.5rem; 
                font-weight: 800;
                font-family: 'Orbitron', sans-serif;
              }

              .avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                margin-bottom: 1rem;
                border: 2px solid var(--primary);
                box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="brand">LEILOS</div>
                <img class="avatar" src="${discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" />
                ${isHighRole ? '<div class="high-role-badge">⭐ ROL ALTO</div>' : ''}
                <h2>Finalizar Registro</h2>
                <div class="info">ID: <b>${discordUser.id}</b></div>
                
                <form action="/api/v2/discord/register" method="POST">
                  <input type="hidden" name="discordId" value="${discordUser.id}">
                  <input type="hidden" name="username" value="${discordUser.username}">
                  <input type="hidden" name="avatar" value="${discordUser.avatar || ''}">
                  <input type="hidden" name="isHighRole" value="${isHighRole}">
                  
                  <div class="input-group">
                    <label>Tu Correo Leilos</label>
                    <input type="text" value="${email}" disabled style="color: #555; cursor: not-allowed;">
                  </div>

                  <div class="input-group">
                    <label>Contraseña de Acceso</label>
                    <input type="password" name="password" placeholder="Mínimo 6 caracteres" required minlength="6">
                  </div>

                  <button type="submit">Crear Mi Cuenta</button>
                </form>
              </div>
            </div>
          </body>
        </html>
      `);
    } else {
      // Si el usuario existe, actualizar su avatar e IP
      await User.updateOne({ discordId: discordUser.id }, { 
        avatar: discordUser.avatar || '',
        lastIp: req.ip,
        lastLogin: new Date()
      });
    }

    // Si ya existe, redirigir al Dashboard
    res.redirect(`/api/v2/dashboard?id=${discordUser.id}`);

  } catch (error) {
    console.error('OAuth Error:', error);
    res.status(500).send('Error en la autenticación.');
  }
});

// 3. Registro final
router.post('/api/v2/discord/register', async (req, res) => {
  const { discordId, username, password, avatar, isHighRole } = req.body;
  const moderators = config.moderators || [];

  try {
    const isAdmin = moderators.includes(discordId) || isHighRole === 'true'; 
    
    // Si ya existía uno incompleto o corrupto, lo eliminamos para crear el nuevo correctamente
    await User.deleteOne({ discordId });

    const resp = await functions.registerUser(discordId, username, `${discordId}@leilos.tf`, password);

    if (resp.status >= 400) {
      return res.status(resp.status).send(resp.message);
    }

    // Actualizamos avatar e isAdmin si es necesario
    await User.updateOne({ discordId }, { avatar: avatar || '', isAdmin, isWhitelisted: isAdmin });

    res.redirect(`/api/v2/dashboard?id=${discordId}`);
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).send('Error al crear la cuenta.');
  }
});

// 4. Dashboard (Panel de Control Mejorado)
router.get('/api/v2/dashboard', async (req, res) => {
  const { id } = req.query;
  const sessionUser = req.cookies?.leilos_session;

  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  if (!id) return res.redirect(`/api/v2/dashboard?id=${sessionUser}`);

  const adminCheck = await User.findOne({ discordId: sessionUser });
  if (sessionUser !== id && (!adminCheck || !adminCheck.isAdmin)) {
    return res.status(403).send('Acceso denegado.');
  }

  const user = await User.findOne({ discordId: id });
  if (!user) return res.status(404).send('Usuario no encontrado.');

  const avatarUrl = user.avatar 
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` 
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`;

  const isConnected = (global.Clients || []).some(i => i.accountId == user.accountId);
  const activeSessions = (global.accessTokens || []).filter(i => i.accountId == user.accountId).length;

  res.send(`
    <html>
      <head>
        <title>Leilos Dashboard | ${user.username}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@300;400;600;700&display=swap');
          
          :root {
            --primary: #D4AF37;
            --primary-hover: #F5Edc3;
            --bg-dark: #050505;
            --bg-card: #0a0a0a;
            --text-main: #ffffff;
            --text-muted: #b8b8b8;
            --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
            --border: rgba(212, 175, 55, 0.1);
            --success: #00ff00;
            --danger: #ff0000;
          }

          * { scrollbar-width: thin; scrollbar-color: var(--primary) var(--bg-dark); }
          ::-webkit-scrollbar { width: 12px; }
          ::-webkit-scrollbar-track { background: var(--bg-dark); }
          ::-webkit-scrollbar-thumb { background-color: var(--primary); border-radius: 6px; border: 3px solid var(--bg-dark); }

          body { 
            font-family: 'Rajdhani', sans-serif; 
            background: var(--bg-dark); 
            color: var(--text-main); 
            margin: 0;
            padding: 2rem 1rem;
            display: flex;
            justify-content: center;
            min-height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
          }

          body:before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            pointer-events: none;
            z-index: -1;
          }

          .container { 
            max-width: 900px; 
            width: 100%; 
            background: var(--bg-card); 
            border-radius: 8px; 
            border: 1px solid var(--border); 
            padding: 3rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            position: relative;
            margin: auto;
            margin-bottom: 2rem;
          }

          .container:after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--gold-gradient);
          }

          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid var(--border);
            flex-wrap: wrap;
            gap: 20px;
          }

          .user-profile { display: flex; align-items: center; gap: 1.5rem; }
          .avatar-img { 
            width: 80px; 
            height: 80px; 
            border-radius: 50%; 
            border: 2px solid var(--primary);
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
          }

          .status-badge { 
            padding: 6px 16px; 
            border-radius: 4px; 
            font-size: 0.7rem; 
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            font-family: 'Orbitron', sans-serif;
          }
          .online { background: rgba(0, 255, 0, 0.1); color: var(--success); border: 1px solid var(--success); }
          .offline { background: rgba(255, 0, 0, 0.1); color: var(--danger); border: 1px solid var(--danger); }
          
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
          .card-stat { 
            background: rgba(255, 255, 255, 0.02); 
            padding: 1.5rem; 
            border-radius: 4px; 
            border: 1px solid var(--border);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }
          .card-stat:after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--gold-gradient);
            transform: scaleX(0);
            transition: transform 0.3s ease;
          }
          .card-stat:hover { 
            transform: translateY(-5px); 
            border-color: rgba(212, 175, 55, 0.3); 
            background: rgba(212, 175, 55, 0.05);
          }
          .card-stat:hover:after { transform: scaleX(1); }

          .label { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: bold; letter-spacing: 1px; font-family: 'Orbitron', sans-serif; }
          .value { 
            font-size: 0.9rem; 
            font-weight: 600; 
            color: var(--text-main); 
            word-break: break-all;
            font-family: 'Consolas', monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 8px;
            border-radius: 4px;
            display: block;
            margin-top: 5px;
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
          
          .btn {
            background: transparent;
            color: var(--primary);
            border: 2px solid var(--primary);
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            text-decoration: none;
            display: inline-block;
            transition: 0.3s;
            font-size: 0.9rem;
            text-align: center;
            font-family: 'Orbitron', sans-serif;
            text-transform: uppercase;
            position: relative;
            overflow: hidden;
            z-index: 1;
          }
          .btn:before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 0%;
            height: 100%;
            background: var(--primary);
            transition: width 0.3s ease;
            z-index: -1;
          }
          .btn:hover { color: var(--bg-dark); box-shadow: 0 0 15px rgba(212, 175, 55, 0.3); }
          .btn:hover:before { width: 100%; }

          .btn-danger { color: var(--danger); border-color: var(--danger); }
          .btn-danger:before { background: var(--danger); }
          .btn-danger:hover { color: white; box-shadow: 0 0 15px rgba(255, 0, 0, 0.3); }
          
          .form-group { margin-bottom: 1.5rem; text-align: left; }
          .form-group label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; }
          .form-group input { 
            width: 100%; 
            padding: 14px; 
            background: #050505; 
            border: 1px solid var(--border); 
            border-radius: 4px; 
            color: white; 
            box-sizing: border-box;
            transition: 0.3s;
            font-family: 'Rajdhani', sans-serif;
            font-size: 1rem;
          }
          .form-group input:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 10px rgba(212, 175, 55, 0.1); }
          
          .section-title { 
            margin-top: 3rem; 
            margin-bottom: 1.5rem; 
            border-bottom: 1px solid var(--border); 
            padding-bottom: 0.5rem; 
            color: var(--primary); 
            font-size: 1.2rem; 
            font-weight: 800;
            text-transform: uppercase; 
            letter-spacing: 2px; 
            font-family: 'Orbitron', sans-serif;
          }

          .alert { padding: 15px; border-radius: 4px; margin-bottom: 1.5rem; font-size: 0.9rem; border: 1px solid transparent; }
          .alert-success { background: rgba(0, 255, 0, 0.05); color: var(--success); border-color: rgba(0, 255, 0, 0.2); }
          .alert-danger { background: rgba(255, 0, 0, 0.05); color: var(--danger); border-color: rgba(255, 0, 0, 0.2); }
          
          @media (max-width: 768px) {
            .container { padding: 1.5rem; }
            .header { justify-content: center; text-align: center; }
            .user-profile { flex-direction: column; }
            .grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="user-profile">
              <img src="${avatarUrl}" class="avatar-img" />
              <div>
                <h1 style="margin: 0; font-size: 1.8rem; font-family: 'Orbitron', sans-serif; text-transform: uppercase;">${user.username}</h1>
                <p style="margin: 5px 0 0 0; color: var(--text-muted); font-weight: 600;">${user.email}</p>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
              <span class="status-badge ${isConnected ? 'online' : 'offline'}">
                ${isConnected ? 'SISTEMA ONLINE' : 'SISTEMA OFFLINE'}
              </span>
              <a href="/api/v2/logout" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.7rem;">Cerrar Sesión</a>
            </div>
          </div>

          ${req.query.success ? `<div class="alert alert-success">✅ ${req.query.success === 'name' ? 'Nombre actualizado' : req.query.success === 'ban' ? 'Usuario baneado' : req.query.success === 'unban' ? 'Usuario desbaneado' : req.query.success === 'kick' ? 'Usuario expulsado' : 'Operación exitosa'}.</div>` : ''}
          ${req.query.error ? `<div class="alert alert-danger">❌ ${req.query.error === 'notfound' ? 'Usuario no encontrado' : 'Error en el servidor'}.</div>` : ''}

          <div class="grid">
            <div class="card-stat">
              <div class="label">ID de Cuenta</div>
              <div class="value">${user.accountId}</div>
            </div>
            <div class="card-stat">
              <div class="label">Discord ID</div>
              <div class="value">${user.discordId}</div>
            </div>
            <div class="card-stat">
              <div class="label">Estado de Acceso</div>
              <div class="value" style="color: ${user.banned ? 'var(--danger)' : 'var(--success)'}">
                ${user.banned ? '⚠️ BANEADO' : '✅ ACTIVO'}
              </div>
            </div>
            <div class="card-stat">
              <div class="label">Privilegios</div>
              <div class="value">${user.isAdmin ? '⭐ Administrador' : '👤 Usuario'}</div>
            </div>
            <div class="card-stat">
              <div class="label">Última IP Detectada</div>
              <div class="value">${user.lastIp || 'No registrada'}</div>
            </div>
            <div class="card-stat">
              <div class="label">Sesiones Activas</div>
              <div class="value">${activeSessions} dispositivo(s)</div>
            </div>
          </div>

          ${adminCheck && adminCheck.isAdmin ? `
            <div class="section-title">🛡️ Panel de Administración</div>
            <div class="grid">
              <div class="card-stat">
                <div class="label">Gestionar Usuario (ID o Nombre)</div>
                <form action="/api/v2/admin/manage" method="POST">
                  <div class="form-group">
                    <input type="text" name="target" placeholder="Discord ID o Username" required>
                  </div>
                  <div class="form-group" id="reason-container" style="display: none;">
                    <input type="text" name="reason" placeholder="Motivo del baneo (opcional)">
                  </div>
                  <div style="display: flex; gap: 10px;">
                    <button type="submit" name="action" value="ban" class="btn btn-danger" style="flex: 1;" onclick="document.getElementById('reason-container').style.display='block'; if(this.dataset.clicked !== 'true') { this.dataset.clicked = 'true'; return false; }">Ban</button>
                    <button type="submit" name="action" value="unban" class="btn" style="flex: 1; border-color: var(--success); color: var(--success);">Unban</button>
                    <button type="submit" name="action" value="kick" class="btn" style="flex: 1; border-color: #ff9900; color: #ff9900;">Kick</button>
                  </div>
                </form>
              </div>
            </div>
          ` : ''}

          <div class="section-title">Configuración de Cuenta</div>
          <div class="grid">
            <div class="card-stat">
              <div class="label">Cambiar Nombre</div>
              <form action="/api/v2/user/update-name" method="POST">
                <div class="form-group">
                  <input type="text" name="newUsername" placeholder="${user.username}" required minlength="3">
                </div>
                <button type="submit" class="btn">Actualizar</button>
              </form>
            </div>
            <div class="card-stat">
              <div class="label">Cambiar Contraseña</div>
              <form action="/api/v2/user/update-password" method="POST">
                <div class="form-group">
                  <input type="password" name="newPassword" placeholder="Nueva contraseña" required minlength="6">
                </div>
                <button type="submit" class="btn">Actualizar</button>
              </form>
            </div>
          </div>

          <div style="margin-top: 3rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; font-family: 'Orbitron', sans-serif; letter-spacing: 1px;">
            PROJECT LEILOS 2026 | DESARROLLADO POR CRISUTF
          </div>
        </div>
      </body>
    </html>
  `);
});

// Admin Actions
router.post('/api/v2/admin/manage', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { target, action, reason } = req.body;

  const admin = await User.findOne({ discordId: sessionUser });
  if (!admin || !admin.isAdmin) return res.status(403).send('Acceso denegado.');

  const targetUser = await User.findOne({ 
    $or: [{ discordId: target }, { username: target }, { username_lower: target.toLowerCase() }] 
  });

  if (!targetUser) return res.redirect(`/api/v2/dashboard?id=${sessionUser}&error=notfound`);

  if (action === 'ban') {
    const banReason = reason || 'Baneado desde el Dashboard';
    await targetUser.updateOne({ banned: true, banReason: banReason });
    
    // Notificar al usuario por DM a través del bot
    await discordBot.sendBanNotification(targetUser.discordId, banReason);

    // Limpiar tokens
    let rt = (global.refreshTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (rt != -1) global.refreshTokens.splice(rt, 1);
    let at = (global.accessTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (at != -1) {
        global.accessTokens.splice(at, 1);
        let xmpp = (global.Clients || []).find(c => c.accountId == targetUser.accountId);
        if (xmpp) xmpp.client.close();
    }
    functions.UpdateTokens();
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=ban`);
  } else if (action === 'unban') {
    await targetUser.updateOne({ banned: false, banReason: '' });
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=unban`);
  } else if (action === 'kick') {
    let rt = (global.refreshTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (rt != -1) global.refreshTokens.splice(rt, 1);
    let at = (global.accessTokens || []).findIndex(i => i.accountId == targetUser.accountId);
    if (at != -1) {
        global.accessTokens.splice(at, 1);
        let xmpp = (global.Clients || []).find(c => c.accountId == targetUser.accountId);
        if (xmpp) xmpp.client.close();
    }
    functions.UpdateTokens();
    res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=kick`);
  }
});

router.get('/api/v2/logout', (req, res) => {
  res.clearCookie('leilos_session');
  res.redirect('/api/v2/discord/login');
});

router.post('/api/v2/user/update-name', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { newUsername } = req.body;
  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  
  await User.updateOne({ discordId: sessionUser }, { username: newUsername, username_lower: newUsername.toLowerCase() });
  res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=name`);
});

router.post('/api/v2/user/update-password', async (req, res) => {
  const sessionUser = req.cookies?.leilos_session;
  const { newPassword } = req.body;
  if (!sessionUser) return res.redirect('/api/v2/discord/login');
  
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ discordId: sessionUser }, { password: hashedPassword });
  res.redirect(`/api/v2/dashboard?id=${sessionUser}&success=password`);
});

module.exports = router;