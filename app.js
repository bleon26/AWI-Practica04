import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import moment from 'moment-timezone';
import mongoose from 'mongoose';
import forge from 'node-forge';
import Session from './models/models.js';

const app = express();
const PORT = 3500;

// Conexión a MongoDB
mongoose.connect('mongodb+srv://brandonleon:luzleon2610b@clusterleon.wpahm.mongodb.net/apisessiones?retryWrites=true&w=majority&appName=ClusterLeon')
.then((db)=> console.log("MongoDB Atlas Connected"))
.catch((error)=> console.error(error));


// Generación de claves RSA
const keypair = forge.pki.rsa.generateKeyPair(600);
const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);

app.listen(PORT, () => {
  console.log(`Server iniciado en http://localhost:${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "BLC-LuzLeon-SesionesHTTP-VariablesDeSesion",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10 * 60 * 1000 }
  })
);

app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'Bienvendi@ a la API de Control de Sesiones',
    author: 'Brandon Leon Cabrera'
  });
});

const getLocalIp = () => {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
};

const getServerMac = () => {
  return new Promise((resolve, reject) => {
    macaddress.one((err, mac) => {
      if (err) {
        reject(err);
      }
      resolve(mac);
    });
  });
};

const encryptData = (data) => {
  const encrypted = keypair.publicKey.encrypt(data, 'RSA-OAEP');
  return forge.util.encode64(encrypted);
};

app.post('/login', async (req, res) => {
  const { email, nickname, macAddress } = req.body;
  if (!email || !nickname || !macAddress) {
    return res.status(400).json({
      message: 'Se esperan campos requeridos'
    });
  }

  const sessionID = uuidv4();
  const createdAt_CDMX = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');
  const serverIp = encryptData(getLocalIp() || '');
  const serverMac = encryptData(await getServerMac());
  const encryptedMacAddress = encryptData(macAddress);

  const sessionData = new Session({
    sessionID,
    email,
    nickname,
    macAddress: encryptedMacAddress,
    createdAt: createdAt_CDMX,
    lastAccessed: createdAt_CDMX,
    serverIp,
    serverMac,
    status: "Activa"
  });

  await sessionData.save();
  req.session.sessionID = sessionID;

  res.status(200).json({
    message: 'Se ha logueado de manera exitosa',
    sessionID
  });
});

app.post('/logout', async (req, res) => {
  const { sessionID } = req.session;

  if (!sessionID) {
    return res.status(404).json({
      message: 'No existe una sesión activa'
    });
  }

  await Session.updateOne({ sessionID }, { status: "Finalizada por el Usuario" });
  req.session.destroy();

  res.status(200).json({
    message: 'Logout exitoso'
  });
});

app.post('/update', async (req, res) => {
  const { email, nickname } = req.body;

  if (!req.session.sessionID) {
    return res.status(404).json({
      message: 'No existe una sesión activa'
    });
  }

  const session = await Session.findOne({ sessionID: req.session.sessionID });
  if (!session) {
    return res.status(404).json({ message: 'Sesión no encontrada' });
  }

  if (email) session.email = email;
  if (nickname) session.nickname = nickname;
  session.lastAccessed = moment().tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss');

  await session.save();

  res.status(200).json({
    message: 'Datos actualizados',
    session
  });
});

app.get('/status', async (req, res) => {
  const { sessionID } = req.session;

  if (!sessionID) {
    return res.status(404).json({
      message: 'No existe una sesión activa'
    });
  }

  const session = await Session.findOne({ sessionID });
  if (!session) {
    return res.status(404).json({ message: 'Sesión no encontrada' });
  }

  const now = moment().tz('America/Mexico_City');
  const inactividad = now.diff(moment(session.lastAccessed).tz('America/Mexico_City'), 'minutes');
  const duracion = now.diff(moment(session.createdAt).tz('America/Mexico_City'), 'minutes');

  res.status(200).json({
    message: 'Sesión activa',
    session,
    inactividad: `${inactividad} minutos`,
    duracion: `${duracion} minutos`
  });
});

app.get('/Sessions', async (req, res) => {
  const sessions = await Session.find();

  if (sessions.length === 0) {
    return res.status(404).json({
      message: 'No hay sesiones'
    });
  }

  const now = moment().tz('America/Mexico_City');
  const formattedSessions = sessions.map(session => {
    const inactividad = now.diff(moment(session.lastAccessed).tz('America/Mexico_City'), 'minutes');
    return {
      ...session._doc,
      createdAt: moment(session.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
      lastAccessed: moment(session.lastAccessed).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
      inactividad: `${inactividad} minutos`
    };
  });

  res.status(200).json({
    message: 'Sesiones activas',
    sessions: formattedSessions
  });
});

app.get('/currentSessions', async (req, res) => {
  try {
    const activeSessions = await Session.find({ status: "Activa" });

    if (activeSessions.length === 0) {
      return res.status(404).json({ message: 'No hay sesiones activas' });
    }

    const formattedSessions = activeSessions.map(session => ({
      ...session._doc,
      createdAt: moment(session.createdAt).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
      lastAccessed: moment(session.lastAccessed).tz('America/Mexico_City').format('YYYY-MM-DD HH:mm:ss'),
    }));

    res.status(200).json({ message: 'Sesiones activas', sessions: formattedSessions });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sesiones activas', error });
  }
});

app.delete('/delete', async (req, res) => {
  try {
    await Session.deleteMany({});
    res.status(200).json({ message: 'Todas las sesiones han sido eliminadas.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar las sesiones', error });
  }
});

// Intervalo para verificar la inactividad de las sesiones
setInterval(async () => {
  const now = moment().tz('America/Mexico_City');  // Asegurarse de usar la hora de Ciudad de México
  const sessions = await Session.find();
  for (const session of sessions) {
    const lastAccessed = moment(session.lastAccessed).tz('America/Mexico_City');
    const inactividad = now.diff(lastAccessed, 'minutes');

    if (inactividad > 10) {
      await Session.updateOne({ sessionID: session.sessionID }, {
        status: `Inactiva por ${inactividad} minutos`,
        lastAccessed: now.format('YYYY-MM-DD HH:mm:ss') // Guardar la hora actual en el formato adecuado
      });
    }
  }
}, 60000); // Se ejecuta cada minuto
