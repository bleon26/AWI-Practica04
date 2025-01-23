//Exportacion de librerias necesarias
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import os from 'os';

const app = express();
const PORT = 3000;

app.listen(PORT,()=>{
    console.log(`Servidor iniciado en http://localhost:${PORT}`)
})

app.use(express.json())
app.use(express.urlencoded({extended:true}));

//Sesiones almacenadas en Memoria(RAM)
//const session = {};

app.use(
    session({
        secret:"leon2610b-SesionesHTTP-VariablesDeSesion",
        resave:false,
        saveUninitialized:false,
        cookie:{maxAge: 5 * 60 * 1000}
    })
)

app.get('/',(req,res)=>{
    return res.status(200).json({message:"Bienvenid@ al API de Control de Sesiones",
                                author:"Brandon Leon Cabrera."})
})

//Función de utilidad que nos permitirá acceder a la información de red
const getLocalIp=()=>{
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces){
        const interfaces=networkInterfaces[interfaceName];
        for(const iface of interfaces){
            //IPv4 y no interna (no localhost)
            if(iface.family === "IPv4" && !iface.internal){
                return iface.address;
            }
        }
    }
    return null; //Retorna null si no encuntra una IP válida
};

app.post('/login',(req,res)=>{
    const{email,nickname,macAddress}=req.body;
    if(!email || !nickname || !macAddress){
        return res.status(400).json({message:"Se esperan campos requeridos"})
    }

    const sessionId=uuidv4();
    const now=new Date();

    session[sessionId]={
        sessionId,
        email,
        nickname,
        macAddress,
        ip:getLocalIp(),
        createAt:now,
        lastAcces:now
    };

    res.status(200).json({
        message: "Se ha logeado de manera exitosa",
        sessionId,
    });
});

app.post("/logout",(req,res)=>{
    const {sessionId} =req.body;
    if(!sessionId || !sessions[sessionId]){
        return res.status(404).json({message: "No se ha encontrado una sesion activa"});
    }
    delete sessions[sessionId];
    req.session.destroy((err)=>{
        if(err){
            return res.status(500).send('Error al cerrar sesión')
        }
    })
    res.status(200).json({message:"Logout successful"});
});

app.post("/update", (req,res)=>{
    const {sessionId, email, nickname}=req.body;

    if(!sessionId || !sessions[sessionId]){
        return res.status(404).json({message:"No existe una sesion activa"})
    }
    if(email) sessions[sessionId].email=email;
    if(nickname) sessions[sessionId].nickname=nickname;
    IdleDeadline()
    sessions[sessionId].lastAcces=new Date();
})

app.get("/status",(req,res)=>{
    const sessionId =req.query.sessionId;
    if(!sessionId || !sessions[sessionId]){
        return res.status(404).json({
            message:"No existe una sesion activa"
        });
    }
    res.status(200).json({
        message:'sesión activa',
        session:sessions[sessionId]
    });
});
