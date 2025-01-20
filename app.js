import express, {request,response} from 'express';
import session from 'express-session';
import bodyPatser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import os from 'os';
import { Interface } from 'readline';

const app=express();
const port=3500;

app.listen(port,()=>{
    console.log(`servidor iniciado en http://localhost:${port}`)
})
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const sessions={}

app.use(
    session({
        secret:"P4-BLC#Luzleon-SessionesHTTP-VariablesDeSesion",
        resave:false,
        saveUninitialized:false,
        cookie:{maxAge: 5 * 60 * 100}
    })
)

app.get('/',(req,res)=>{
    return response.status(200).json({
        message:'Bienvenido al API de control de sesiones',
        author : "Brandon Leon Cabrera" 
    })
})

const getLocalIP=()=>{
    const networkInterfaces=os.networkInterfaces();
    for(const interfaceName in networkInterfaces){
        const interfaces=networkInterfaces[interfaceName];
        for(const iface of interfaces){
            if(iface.family==='IPv4' && !iface.internal){
                return iface.address;
            }
        }
    }
    return null;
}
app.post('/login',(request,response)=>{
    const {email,nickname,macaAddress}=request.body;
    if(!email || !nickname || !macaAddress){
        return response.status(400).json({
            message:'Faltan parametros'});
        }
    const sessionId = uuidv4();
    const now = new Date();

    sessions[sessionId]={
        sessionId,
        email,
        nickname,
        macaAddress,
        ip:getLocallip(request),
        createdAt:now,
        lastAccessedAt:now,

    };
    res.status(200).json({
        message:'Sesion iniciada',
        sessionId
    });
});

app.get('/logout',(request,response)=>{
    const {sessionId}=request.body;
    if(!sessionId|| !sessions[sessionId]){
        return response.status(400).json({
            message:'no se encontraron un sesion activa'
        });
    }
    delete sessions[sessionId];
    request.session.destroy((err)=>{
        if(err){
            return response.status(500).send(message:'Error al cerrar la sesion')
        }
    })
    reponse.status(200).json({message:"Loguot successful"});
})

app.post("/update",(req,res)=>{
});

app.get("/status",(req,res)=>{
    const {sessionId}=req.query;
    if(!sessionId|| !sessions[sessionId]){
        return res.status(400).json({
            message:'no se encontraron un sesion activa'
        });
    }
    res.status(200).json({
        message:'Sesion actualizada correctamente',
        session:sessions[sessionId]
    });
})
