# librerias y dependencias para el desarrollo de la interfáz
from flask import Flask, render_template, jsonify,session, Response, request, Blueprint, redirect, url_for
from bson import json_util, ObjectId
from pymongo import MongoClient
import ollama
from pypdf import PdfReader
import json
import os
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

def login_requerido(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        if 'logged' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorador

# __file__ ruta actual del main (backend/app/main.py)
current_file = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(current_file))) 
print(f"__file__: {__file__}") #debug
print(f"__file__: {current_file}")
print(f"BASE_DIR: {BASE_DIR}")
# Definición de las rutas de los templates y archivos estáticos (css, js, imagenes)
template_path = os.path.join(BASE_DIR, 'frontend/templates')
static_path = os.path.join(BASE_DIR, 'frontend/assets')
pdf_path = os.path.join(BASE_DIR,'frontend/assets/data/pdf')


# Inicializar aplicación Flask con las rutas ya configuradas
chat = Blueprint("chat", __name__, 
    template_folder=template_path,
    static_folder=static_path
)

# Llave secreta de Flask
chat.secret_key= os.getenv("FLASK_SECRET_KEY")

# IA API KEY
model_name = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# conexión con MongoDB
mongodb_uri=os.getenv("MONGODB_URI")
mongodb_database=os.getenv("MONGODB_DATABASE")

try: 
    cliente =MongoClient(mongodb_uri)
    chat.db = cliente[mongodb_database]
except Exception as e:
    print("Error en la conexión con MongoDB: {e}")
    chat.db = None


# Endpoint para construir el menu desplegable
@chat.route("/api/capas/lista")
def listado_layers():
    try:
        colecciones= chat.db.list_collection_names()
        categorias = {"geo_estados": "geoestadisticas",
                      "geo_municipios": "geoestadisticas",
                      "geo_localidades": "geoestadisticas",

                      "hidro_rh": "hidrologia",
                      "hidro_cuencas": "hidrologia",
                      "hidro_rios": "hidrologia",
                      "hidro_cuerpos": "hidrologia",
                      

                      "riesgo_inundacion": "vulnerabilidad",
                      "zonas_inundables": "vulnerabilidad",
                      "refugios_temporales": "otros",
                      "brigadas_comunitarias": "otros"}
        
        nombres_menu= {"geo_estados": "Estados",
                      "geo_municipios": "Municipios",
                      "geo_localidades": "Localidades",

                      "hidro_rh": "Región hidrológica",
                      "hidro_cuencas": "Cuencas hidrológicas",
                      "hidro_rios": "Ríos principales",
                      "hidro_cuerpos": "Cuerpos de agua",
                      

                      "riesgo_inundacion": "Índice de peligro por inundación",
                      "zonas_inundables": "Zonas susceptibles a inundación",

                      "refugios_temporales": "Refugios temporales",
                      "brigadas_comunitarias": "Brigadas comunitarias activas"

        }
        salida= {}

        for col in colecciones:
            if col in categorias: 
                capa=categorias.get(col,"otros")
                menu_nombre= nombres_menu.get(col, col)

                if capa not in salida:
                    salida[capa]=[]

                salida[capa].append({"id":col, "nombre":menu_nombre})
            else:
                if "otros" not in salida:
                    salida["otros"]=[]
                salida["otros"].append({
                    "id":col, "nombre":col
                })
        print("Datos enviados al frontend:", salida) #debug
        return jsonify(salida)
    except Exception as e:
        print("Error en /api/capas/lista:", e) #debug
        return {"error": str(e)}, 500

# Endpoint para obtener cada una de las capas
@chat.route('/api/capas/<coleccion>')
def obtencion_capa(coleccion):
    try:
        if coleccion not in chat.db.list_collection_names():
            return jsonify({"error":"La coleccion no existe"}), 404
        
        capa_col = chat.db[coleccion].find_one({})

        if not capa_col:
            return jsonify({"type":"FeatureCollection","features":[]})
        capa_col['_id']=str(capa_col['_id'])
        
        if "features" in capa_col:
            for f in capa_col["features"]:
                if "_id" in f:
                    f["_id"]= str(f["_id"])

                #Categorización
                if coleccion== "riesgo_inundacion" and "properties" in f:
                    riesgo=f["properties"].get("Peligro")
                    if riesgo:
                        riesgo_normalizado=riesgo.upper().strip()
                        f["properties"]["_categoria_riesgo"]=riesgo_normalizado
                        f["properties"]["_color_riesgo"]= obtener_color_riesgo(riesgo_normalizado)
        
        capa_col['crs']={
            "type": "name", 
            "properties":{
                "name":"urn:ogc:def:crs:OGC:1.3:CRS84" #identificador oficial
                }
        }

        return Response(json_util.dumps(capa_col), 
                        mimetype="application/json")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def obtener_color_riesgo(riesgo):
    colores ={
        "MUY ALTO": "#8b0000",  # Rojo oscuro
        "ALTO": "#ff0000",      # Rojo
        "MEDIO": "#ffa500",     # Naranja
        "BAJO": "#ffff00",      # Amarillo
        "MUY BAJO": "#90ee90",  # Verde claro
        "SIN DATOS": "#cccccc"  # Gris
    }
    return colores.get(riesgo,"#cccccc")


## ----------- Aquí empíeza la parte del chat --------------------------------

# Funcón para la lectura de la información
def lectura_info_chunks(pdf_name, max_chars=2000):
    chunks= []
    try:
        ruta=os.path.join(pdf_path, pdf_name)
        #Verificación de existencia del archhivo
        if not os.path.exists(ruta):
             print(f"Archivo no encontrado: {ruta}") #debbug
             return ""
    
        with open(ruta, 'rb') as file:
            reader=PdfReader(file)
            texto= ""
            # Extracción de todo el contenido del pdf
            for pagina in reader.pages:
                text =pagina.extract_text()
                if text:
                    texto+= text+"/n"

            #División en pártes manejables
            for i in range (0,len(texto), max_chars):
                chunks.append(texto[i:i+max_chars])
        
        print(f"El archivo {pdf_name} se ha divido en {len(chunks)} fragmentos")
        return chunks
    except Exception as e:
        print(f"Error cargando el archivo {pdf_name}: {e}")
        return ""

#Carga de archivos pdf, csv..
datos_riesgos= lectura_info_chunks("Atlas_riesgo_rh_v01.pdf")
datos_prevencion=lectura_info_chunks("Atlas_prevencion_rh_v01.pdf")
datos_cuencas_rh=lectura_info_chunks("cuencas.pdf")

# carga de capas? se puede usar las funciones predefinidas?
system_prompt= f""" Eres una IA especializada en gestión de riesgos hidrometeorológicos en la región hidrológica Tuxpan-Nautla. 
Información general de la región:
En esta región se localizan 4 cuencas principales:
1. Laguna de Tamiahua - Cuenca de la Laguna de Tamiahua
2. Acuífero Poza Rica - Cuenca del Río Cazones  
3. Acuífero Tecolutla - Cuenca del Río Tecolutla
4. Acuífero Martínez de la Torre-Nautla - Cuenca del Río Nautla
La información general fragmentada sobre estas cuencas: {datos_cuencas_rh} fragmentos
Tu función es:
- Responder preguntas sobre esta región hidrológica usando la información disponible
- Consultar el atlas de riesgos: {datos_riesgos} fragmentos
- Consultar las medidas de prevención: {datos_prevencion} fragmentos
Intrucciones específicas:
1.- Si desconoces información solicitada dentro de esta region hidrológica: 
"Esta es la primera fase del proyecto RiskyFlood IA. En futuras actualizaciones agregaremos más información específica."
2. Si la pregunta es sobre sitios fuera de la región o no esta relacionada a tu especialidad responde: 
"Soy un asistente especializado en la región Tuxpan-Nautla. ¿En qué más puedo ayudarte sobre riesgos hidrometeorológicos en esta zona?"
3. Al finalizar algunas respuestas relevantes: 
"Te invito a usar el mapa interactivo localizado en esta página para consultar información espacial sobre cuencas, riesgos meteorológicos y algunos datos 
importantes de la región."
Siempre mantén un tono profesional pero amable.
"""
# APIS simuladas para el chat
@chat.route("/api/chat", methods=["POST"])
def chat_api():
    try:
        data= request.get_json()
        user_message= data.get("message", "")

        if not user_message:
            return jsonify({"status": "error", "message": "Mensaje vacío"}), 400
        
        # Obtención del historial de la sesión
        if "history" not in session:
            session["history"] = []
        history = session["history"]

        #Preparación de los mensajes
        messages = [{"role" : "system", "content" : system_prompt}] 
        messages.extend(history)
        messages.append({"role" : "user", "content" : user_message})

        print("Procesando mensaje del usuario...")
        #Llamada a Ollama
        response = ollama.chat(
            model=model_name,
            messages=messages
        )
        print("Respuesta generada correctamente.")
        bot_response = response['message']['content']

        if bot_response is None:
            bot_response = "No pude generar una respuesta en este momento." #debbug

        # Actualizar el historial
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": bot_response})
        session["history"] = history[-6:]  # Mantener 3 intercambios (6 mensajes)

        return jsonify({
        "status": "success",
        "response": bot_response
        })

    except Exception as e:
        print(f"Error en el chat: {e}")
        return jsonify({
            "status" : "error",
            "response" : "Error procesando tu mensaje. Intentalo nuevamente"
        }), 500

@chat.route("/api/reset", methods=["POST"])
def reset():
    session["history"] = []
    return jsonify({
        "status" : "success",
        "message" : "Chat reiniciado"
    })

# Ruta del chat y del mapa
@chat.route('/')
@login_requerido
def index():
    """Página principal con mapa y chat"""
    return render_template("chat.html", name="RiskyFlood AI")