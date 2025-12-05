//Elementos del menu desplegable del mapa
const menuToggle = document.getElementById('menuToggle');
const layerPanel = document.getElementById('layerPanel');
const closePanel = document.getElementById('closePanel');

// ===== Elementos del DOM del CHAT =====
const chatButton = document.getElementById('chatButton');
const chatModal = document.getElementById('chatbot');
const chatOverlay = document.getElementById('chatOverlay');
const closeButton = document.getElementById('closeButton');
const resetButton = document.getElementById('resetButton');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatBody = document.getElementById('chatBody');

// ========================= MAPA =========================

const capasStyle = {
    "geo_estados": {
        fillColor: '#000000',    
        fillOpacity: 0.2,        // transparente
        color: '#000000',        // Borde 
        weight: 2,               // Línea menos gruesa
        opacity: 0.6
    },
    "geo_municipios": {
        fillColor: '#555555',    // 
        fillOpacity: 0.2,        // transparente
        color: '#555555',        // 
        weight: 1,               // Línea menos gruesa
        opacity: 0.4
    },
    "geo_localidades": {
        fillColor: '#333232ff',    // 
        fillOpacity: 0.2,        // transparente
        color: '#333232ff',        // 
        weight: 1,               // Línea menos gruesa
        opacity: 0.4
    },

    "hidro_rios": {
        color: 'rgba(14, 109, 199, 1)',        // 
        weight: 2,               // Línea menos gruesa
        opacity: 0.8
    },
    "hidro_rh": {
        fillColor: 'transparent',
        fillOpacity: 0,
        color: '#1f3eeeff',        
        weight: 4,               // Línea gruesa
        opacity: 0.8
    },
    "hidro_cuerpos": {
        fillColor: '#8aabf3ff',    // Azul claro
        fillOpacity: 0.6,        // Transparencia
        color: '#8aabf3ff',        // Borde rojo
        weight: 2,               // Línea gruesa
        opacity: 0.8
    },
    "hidro_cuencas": {
        fillColor: '#093e61ff',
        fillOpacity: 0.3,
        color: '#76b1d8ff',
        weight: 3,
        opacity: 0.8
    },

    "riesgo_inundacion": function(feature){
        const riesgo = feature.properties?._categoria_riesgo ||
                        feature.properties?.RIESGO||
                        feature.properties?.riesgo;
        
        const coloresRiesgo = {
            "MUY ALTO": "#8b0000",
            "ALTO": "#ff0000", 
            "MEDIO": "#ffa500",
            "BAJO": "#ffff00",
            "MUY BAJO": "#90ee90"
        };

        const color = coloresRiesgo[riesgo?.toUpperCase()] || "#cccccc";
        
        return {
            fillColor: color,
            fillOpacity: 0.6,
            color: color,
            weight: 2,
            opacity: 0.8
        };
    },
    "refugios_temporales":{
        pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 8,
            fillColor: "#4CAF50",  
            color: "#2E7D32",      // Borde 
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
            });
        }
    },
    "brigadas_comunitarias": {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: "#FF9800",  // Naranja
                color: "#E65100",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    },
    "default_point": {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#666666",
                color: "#333333",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });
        }
    },
        "default": {
        fillColor: "#000000",
        fillOpacity: 0.2,
        color: "#000000",
        weight: 2,
        opacity: 0.6
    }
    
};

// Apertura del panel
menuToggle.addEventListener("click", function(e){
    e.stopPropagation(); // con esto evitamos problemas de propagación 
    e.preventDefault();
    layerPanel.classList.toggle("open");
});

//Cierre del panel
closePanel.addEventListener("click", function(e){
    e.stopPropagation();
    e.preventDefault();
    layerPanel.classList.remove("open");
});
// Cierre cuando se de click afuera dle panel
document.addEventListener("click", function(e) {
    if (!layerPanel.contains(e.target) && e.target !== menuToggle) {
        layerPanel.classList.remove("open");
    }
});

layerPanel.addEventListener("click", function(e) {
    e.stopPropagation();
});

// Carga del menú de las capas
function cargarMenu(){

    fetch("/api/capas/lista")
    .then(function(response) {
        return response.json();
    })
    .then(function(data)
        {
            //Nivel 0 contenedor vacio en donde se albergará el panel
            const panel = document.getElementById("layerPanel");

            // Primer nivel, contenedor general del menú (caja que guardará el menú)
            const listContainer = document.createElement("div");
            listContainer.classList.add("layer-list");

            //Segundo nivel en donde crearemos las categorías y las recorremos
            Object.keys(data).forEach(function(categoria){

                // contenedor para cada categodría
                const categoriaDiv=document.createElement("div");
                categoriaDiv.classList.add("categoria");

                // heading de tipo h4 para el título de cada categodría
                const titulo = document.createElement("h4");
                const categoriasCorrregidas ={
                    "geoestadisticas": "División Política",
                    "hidrologia": "Hidrología",
                    "vulnerabilidad": " Riesgos Hidrometeorológicos",
                    "otros": "Rutas de evacuación"
                }

                titulo.textContent=categoriasCorrregidas[categoria]|| categoria;
                categoriaDiv.appendChild(titulo);

                //creación de ul en donde van los checkboxes (to display a list of items)
                const ul = document.createElement("ul");

                //Tercer nivel para cada capa o item dentro de las categorías
                data[categoria].forEach(nombreCapa =>
                {
                    // creación de un renglón por capa
                    const li = document.createElement("li");

                    // creación del checkbox para activar/desactivar capas
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.dataset.capa= nombreCapa.id;

                    // Para mostrar el texto aun lado de cada capa
                    const label = document.createElement("label");
                    label.textContent=nombreCapa.nombre;
                    label.title=nombreCapa.id;

                    //Evento para detectar cuando se desactiva/activa la capa
                    checkbox.addEventListener("change",function (e) {
                        if (e.target.checked){
                            cargarCapa(nombreCapa.id);
                        }else{
                            removerCapa(nombreCapa.id);
                        }
                    });
                    // Inserción de todo en el menú
                    li.appendChild(checkbox);
                    li.appendChild(label);
                    ul.appendChild(li);
                });
                // insertar la lista de la categoría y posteriormente la categoría en el panel
                categoriaDiv.appendChild(ul);
                listContainer.appendChild(categoriaDiv);
            });
            // insertar tood en el panel
            panel.appendChild(listContainer);
        })
        .catch(function(error){
        console.error("Error cargando las capas");
        });
}

// Carga de capas con leaflet

const capasCargadas = {};

function cargarCapa(nombre) {
    fetch(`/api/capas/${nombre}`)
        .then(function (response) {
            return response.json();
        })
        .then(function (geojson) {

            //Detección de tipo de geometría
            const featureInicial = geojson.features[0];
            const tipoGeometria= featureInicial.geometry?.type;

            // Configuración de los pop_ups con información
            let config ={
                onEachFeature: function(feature,layer){
                    const camposExcluir = ['_categoria_riesgo', '_color_riesgo'];
                    let tabla_pop = "<div style='max-height: 200px; overflow-y: auto;'><b>Información</b><br><table>";

                    for (let key in feature.properties) {
                        if(!camposExcluir.includes(key)){
                            tabla_pop += `<tr><td><b>${key}</b></td><td>${feature.properties[key]}</td></tr>`;
                        }  
                    }
                    tabla_pop += "</table></div>";
                    layer.bindPopup(tabla_pop);
                }
            };
            // Manejo de puntos, líneas o polígonos
            if (tipoGeometria==="Point" || tipoGeometria==="MultiPopint"){

                const estilo = capasStyle[nombre]|| capasStyle["default_point"];

                if (estilo.pointToLayer){
                    config.pointToLayer= estilo.pointToLayer;
                } else {
                    config.pointToLayer= function(feature, latlng){
                        return L.circleMarker(latlng, {
                            radius: estilo.radius || 8,
                            fillColor: estilo.fillColor || "#666666",
                            color: estilo.color || "#333333",
                            weight: estilo.weight || 2,
                            opacity: estilo.opacity || 1,
                            fillOpacity: estilo.fillOpacity || 0.8
                        });
                    };

                }
            }else {
                const estilo = capasStyle[nombre];
                //función
                if (typeof estilo ==='function'){
                    config.style= estilo;
                // objeto de estilos
                }else if (estilo) {
                    config.style= estilo;
                } else {
                    //Estilo por defecto
                    config.style= capasStyle["default"];
                }
            }

            const capa = L.geoJSON(geojson, config).addTo(map);
            capasCargadas[nombre]=capa;
        })
        .catch(function (error) {
            console.error("Error cargando capa:", nombre, error);
        });
}

function removerCapa(nombre) {
    if (capasCargadas[nombre]) {
        map.removeLayer(capasCargadas[nombre]);
        delete capasCargadas[nombre];
    }
}




// para inicializar el mapa, se requieren las coordenadas geográficas, el nivel de zoom
// latitud y(19....), longitud x (-98---)
var map = L.map("mapa").setView([20.455639,-97.576959], 8);

//Leyenda inicial del mapa
var leyenda = L.control({position :"bottomright"})

// Inserción de un mapa base, en este caso como ejemplo usaré open street map, como viene en la página
// cambiar posteriormente el mapa base si se puede
//L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
   // attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
//Basemap satelital
var Stadia_AlidadeSatellite= L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 20,
	attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'jpg'
});
//Stadia_AlidadeSatellite.addTo(map);

var CyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
	maxZoom: 20,
	attribution: '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
CyclOSM.addTo(map);
// Evento para cargar las capas iniciales 
// Las que el usuario visualizará al entrar a la página
// document.addEventListener('DOMContentLoaded', function(){
//     cargarMenu();
// });
cargarMenu();


// ========================= chat ========================= 

// ===== Estado de la aplicación =====
let isTyping = false;

// ===== Funciones de Toggle del Modal =====
function openChat() {
    chatModal.classList.add('active');
    chatOverlay.classList.add('active');
    chatButton.style.display = 'none';
    messageInput.focus();
}

function closeChat() {
    chatModal.classList.remove('active');
    chatOverlay.classList.remove('active');
    chatButton.style.display = 'flex';
}

// ===== Event Listeners =====
// chatButton.addEventListener('click', openChat);
// closeButton.addEventListener('click', closeChat);
// chatOverlay.addEventListener('click', closeChat);

// Cerrar con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatModal.classList.contains('active')) {
        closeChat();
    }
});

// ===== Enviar Mensaje =====
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Agregar mensaje del usuario
    addMessage(message, 'user');
    messageInput.value = '';
    adjustTextareaHeight();
    
    // Deshabilitar input mientras se procesa
    setInputState(false);
    
    // Mostrar indicador de escritura
    showTypingIndicator();
    
    try {
        // Enviar mensaje al servidor
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        // Remover indicador de escritura
        removeTypingIndicator();
        
        if (data.status === 'success') {
            // Agregar respuesta del bot con efecto de escritura
            await addMessage(data.response, 'bot');
        } else {
            addMessage('Lo siento, hubo un error. Por favor intenta de nuevo.', 'bot');
        }
    } catch (error) {
        removeTypingIndicator();
        addMessage('Lo siento, no pude conectarme. Verifica tu conexión e intenta nuevamente.', 'bot');
        console.error('Error:', error);
    } finally {
        setInputState(true);
        messageInput.focus();
    }
});

// ===== Resetear Chat =====
resetButton.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de que quieres reiniciar el chat?')) return;
    
    try {
        await fetch('/api/reset', { method: 'POST' });
        
        // Limpiar mensajes excepto el mensaje de bienvenida
        const messages = chatBody.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) { // Mantener el primer mensaje
                msg.style.animation = 'messageSlide 0.3s ease-out reverse';
                setTimeout(() => msg.remove(), 300);
            }
        });
    } catch (error) {
        console.error('Error al resetear:', error);
    }
});

// ===== Auto-resize del textarea =====
messageInput.addEventListener('input', adjustTextareaHeight);

function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// ===== Enviar con Enter (Shift+Enter para nueva línea) =====
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// ===== Agregar Mensaje al Chat =====
async function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = getCurrentTime();
    
    if (sender === 'bot') {
        // Efecto de escritura para mensajes del bot
        messageContent.textContent = '';
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatBody.appendChild(messageDiv);
        scrollToBottom();
        
        await typeWriter(text, messageContent);
    } else {
        messageContent.textContent = text;
        messageDiv.appendChild(messageContent);
        messageDiv.appendChild(messageTime);
        chatBody.appendChild(messageDiv);
        scrollToBottom();
    }
}

// ===== Efecto de Escritura (Typewriter) =====
async function typeWriter(text, element) {
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
        element.textContent += (i > 0 ? ' ' : '') + words[i];
        scrollToBottom();
        
        // Velocidad variable para simular escritura natural
        const delay = Math.random() * 10 + 20;
        await sleep(delay);
    }
}

// ===== Indicador de Escritura =====
function showTypingIndicator() {
    isTyping = true;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(indicator);
    chatBody.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    isTyping = false;
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.style.animation = 'messageSlide 0.3s ease-out reverse';
        setTimeout(() => indicator.remove(), 300);
    }
}

// ===== Funciones Auxiliares =====
function setInputState(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
}

function scrollToBottom() {
    chatBody.scrollTo({
        top: chatBody.scrollHeight,
        behavior: 'smooth'
    });
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Inicialización =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Chat inicializado correctamente');
});