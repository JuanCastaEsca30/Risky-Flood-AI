#Archivo principal de ejecución de la aplicación [Posibilidad de modificar la ruta en la que se encuentra]
import os
from openai import OpenAI
from pypdf import PdfReader
from flask import jsonify
from flask import Flask, render_template, request, redirect, url_for, session
from functools import wraps
from pymongo import MongoClient
from chat import chat

# =============================================================================
# CONFIGURACIÓN INICIAL DE FLASK Y RUTAS
# =============================================================================

# __file__ ruta actual del main (backend/app/main.py)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# Aqui definimos las rutas de los templates y archivos estáticos (css, js, imagenes)
template_path = os.path.join(BASE_DIR, 'frontend/templates')
static_path = os.path.join(BASE_DIR, 'frontend/assets')

# Inicializar aplicación Flask con las rutas ya configuradas
app = Flask(__name__, 
    template_folder=template_path,
    static_folder=static_path
)
app.register_blueprint(chat)


#Clave secreta
app.secret_key = 'Risky_Flood_v1' #Clave temporal, cambiar cuando el proyecto sea lanzado

# =============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =============================================================================

def conexion_bd():
    # conexión con MongoDB
    mongodb_uri=os.getenv("MONGODB_URI")
    mongodb_database=os.getenv("MONGODB_DATABASE_USUARIOS")
    client = MongoClient(mongodb_uri)
    return client['login']

#decorador para proteger rutas al comprobar que haya una sesión activa
def login_requerido(f):
    @wraps(f)
    def decorador(*args, **kwargs):
        if 'logged' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorador

#Ruta de login
@app.route('/login', methods=["GET", "POST"])
def login():
    msg = ''
    #Cuando el usuario pulse el botón "Iniciar Sesión", verificará que todos los campos tengan contenido
    #Posteriormente los almacenara en variables para corroborar su existencia en la base de datos
    if request.method == 'POST' and 'usuario' in request.form and 'password' in request.form:
        usuario = request.form['usuario']
        password = request.form['password']

        conexion = conexion_bd()
        base_datos = conexion['usuarios']
        
        try:
            cuenta = base_datos.find_one({'usuario': usuario})
            print(cuenta)
            if cuenta:
                if password == cuenta['password']:
                    session['logged'] = True
                    session['usuario'] = cuenta['usuario']
                    return redirect(url_for('inicio'))
                else:
                    msg = 'Usuario o contraseña incorrecta'
                    print(msg)
        finally:
            pass
    return render_template('login.html', msg = msg)

#Ruta para crear cuentas
@app.route('/registro', methods=["GET", "POST"])
def registro():
    msg = ''
    inicio = False
    if request.method == 'POST' and 'usuario' in request.form and 'password' in request.form:
        
        conexion = conexion_bd()
        base_datos = conexion['usuarios']
        email = request.form['email']

        if base_datos.find_one({'email':email}):
            msg = 'El email ingresado ya tiene una cuenta asociada'
            print(msg)
        else:
            nombre = request.form['nombre']
            usuario = request.form['usuario']
            sexo = request.form['sexo']
            edad = request.form['edad']
            password = request.form['password']
        try:
            base_datos.insert_one({
                'nombre': nombre,
                'usuario': usuario,
                'sexo': sexo,
                'edad': edad,
                'password': password,
                'email': email
            })
            inicio = True
        finally:
            print(inicio)
            if inicio:
                session['logged'] = True
                session['usuario'] = usuario
                return redirect(url_for('inicio'))
            else:
                return render_template('registro.html', msg=msg)        
    

    return render_template('registro.html', msg=msg)

#Cerrar sesión
@app.route('/logout')
def logout():
    session.pop('logged', None)
    session.pop('id', None)
    session.pop('usuario', None)
    return redirect(url_for('login'))

@app.route('/')
@login_requerido
def inicio():
    return render_template("inicio.html", usuario=session["usuario"])

def pagina_no_encontrada(error):
    return redirect(url_for('inicio'))


# RUTA para mostrar la página del chat 
@app.route('/chat')
@login_requerido
def chat_page():
    return render_template("chat.html", usuario=session["usuario"], name="RiskyFlood AI")

@app.route("/chat", methods=["POST"])
def chat():
    return jsonify({
        "status": "success",
        "response": "Esta funcionalidad estará disponible pronto. Estamos configurando el sistema de IA."
    })

@app.route("/reset", methods=["POST"])
def reset():
    session["history"] = []
    return jsonify({
        "satus" : "success",
        "message" : "Chat reiniciado"
    })

if __name__ == "__main__":
    app.register_error_handler(404, pagina_no_encontrada)
    
    app.run()
    app.debug = True
