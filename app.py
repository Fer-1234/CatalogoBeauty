from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory
import json
import os
import time
from werkzeug.utils import secure_filename
from functools import wraps
import urllib.parse

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'clave_secreta_super_segura_admin_pink')
app.config['UPLOAD_FOLDER'] = 'static/images'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ADMIN_CREDENTIALS = {'username': 'Kairos', 'password': 'Sinergia1'}

@app.route('/static/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('admin'))
        return f(*args, **kwargs)
    return decorated_function

def cargar_productos():
    try:
        with open('productos.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def guardar_productos(productos):
    with open('productos.json', 'w', encoding='utf-8') as f:
        json.dump(productos, f, ensure_ascii=False, indent=2)

def cargar_categorias():
    try:
        with open('categorias.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        categorias_default = {
            "categorias": [
                {"id": "todos", "nombre": "Todos los productos"},
                {"id": "tintes", "nombre": "Tintes"},
                {"id": "decolorantes", "nombre": "Decolorantes"},
                {"id": "shampoo", "nombre": "Shampoo"},
                {"id": "maquillaje", "nombre": "Maquillaje"},
                {"id": "unas", "nombre": "Uñas"},
                {"id": "barberia", "nombre": "Barbería"},
                {"id": "pestanas", "nombre": "Pestañas"},
                {"id": "pelucas", "nombre": "Pelucas"}
            ],
            "filtros": {
                "tintes": ["Yellow", "Kuul", "Anven", "Xianora", "Color tech", "Mallrel", "Ahopor"],
                "decolorantes": ["Decolorantes", "Peroxidos"],
                "shampoo": ["Shampoo", "Tratamientos"],
                "maquillaje": ["Bissu", "Apiple", "Pinkup"],
                "unas": ["Gelish", "Acrilicos", "Alicates"],
                "barberia": ["Tijeras", "Maquinas de rasurar"],
                "pestanas": ["Pestañas", "Accesorios"],
                "pelucas": ["Pelucas", "Chongos", "Extensiones de cabello", "Plancas"]
            }
        }
        guardar_categorias(categorias_default)
        return categorias_default

def guardar_categorias(categorias):
    with open('categorias.json', 'w', encoding='utf-8') as f:
        json.dump(categorias, f, ensure_ascii=False, indent=2)

def obtener_proximo_id():
    productos = cargar_productos()
    if not productos:
        return 1
    return max(producto['id'] for producto in productos) + 1

def eliminar_imagen_antigua(imagen_path):
    try:
        if imagen_path and imagen_path != "default-product.jpg" and not imagen_path.startswith("http"):
            nombre_archivo = os.path.basename(imagen_path)
            ruta_completa = os.path.join(app.config['UPLOAD_FOLDER'], nombre_archivo)
            if os.path.exists(ruta_completa):
                os.remove(ruta_completa)
                print(f"Imagen eliminada: {ruta_completa}")
    except Exception as e:
        print(f"Error al eliminar imagen antigua: {str(e)}")

def limpiar_nombre_archivo(nombre):
    nombre = secure_filename(nombre)
    nombre = nombre.replace(' ', '_')
    return nombre.lower()

# === RUTAS ===

@app.route('/')
def index():
    productos = cargar_productos()
    categorias_data = cargar_categorias()
    return render_template('index.html', productos=productos, categorias=categorias_data['categorias'])

@app.route('/filtrar', methods=['POST'])
def filtrar_productos():
    try:
        productos = cargar_productos()
        categoria = request.form.get('categoria', '')
        
        if categoria and categoria != 'todos':
            productos_filtrados = [p for p in productos if p['categoria'] == categoria]
        else:
            productos_filtrados = productos
            
        return jsonify(productos_filtrados)
    except Exception as e:
        print(f"Error en filtrar_productos: {str(e)}")
        return jsonify([])

@app.route('/realizar-pedido', methods=['POST'])
def realizar_pedido():
    data = request.get_json()
    return jsonify({"status": "success", "message": "Pedido recibido correctamente"})

# === ADMIN ===

@app.route('/admin')
def admin():
    if session.get('logged_in'):
        return redirect(url_for('admin_dashboard'))
    return render_template('login.html')

@app.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        if username == ADMIN_CREDENTIALS['username'] and password == ADMIN_CREDENTIALS['password']:
            session['logged_in'] = True
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Credenciales incorrectas'})
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error del servidor'})

@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    productos = cargar_productos()
    categorias_data = cargar_categorias()
    return render_template('admin.html', productos=productos, categorias=categorias_data['categorias'], filtros=categorias_data['filtros'])

@app.route('/admin/logout')
def admin_logout():
    session.pop('logged_in', None)
    return redirect(url_for('index'))

# === API PRODUCTOS ===

@app.route('/admin/api/productos', methods=['GET'])
@login_required
def api_get_productos():
    productos = cargar_productos()
    return jsonify(productos)

@app.route('/admin/api/productos', methods=['POST'])
@login_required
def api_add_producto():
    try:
        nombre = request.form.get('productName')
        precio = float(request.form.get('productPrice'))
        categoria = request.form.get('productCategory')
        subcategoria = request.form.get('productSubcategory')
        
        imagen = request.files.get('productImage')
        if imagen and imagen.filename:
            filename = limpiar_nombre_archivo(imagen.filename)
            unique_filename = f"{int(time.time())}_{filename}"
            imagen_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            imagen.save(imagen_path)
            imagen_url = f"images/{unique_filename}"
        else:
            imagen_url = "default-product.jpg"
        
        nuevo_producto = {
            'id': obtener_proximo_id(),
            'nombre': nombre,
            'precio': precio,
            'categoria': categoria,
            'subcategoria': subcategoria,
            'imagen': imagen_url
        }
        
        productos = cargar_productos()
        productos.append(nuevo_producto)
        guardar_productos(productos)
        
        return jsonify({'success': True, 'producto': nuevo_producto})
    except Exception as e:
        print(f"Error al agregar producto: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/productos/<int:producto_id>', methods=['PUT'])
@login_required
def api_update_producto(producto_id):
    try:
        productos = cargar_productos()
        producto_index = next((i for i, p in enumerate(productos) if p['id'] == producto_id), None)
        
        if producto_index is None:
            return jsonify({'success': False, 'message': 'Producto no encontrado'})
        
        imagen_anterior = productos[producto_index]['imagen']
        
        productos[producto_index]['nombre'] = request.form.get('productName', productos[producto_index]['nombre'])
        productos[producto_index]['precio'] = float(request.form.get('productPrice', productos[producto_index]['precio']))
        productos[producto_index]['categoria'] = request.form.get('productCategory', productos[producto_index]['categoria'])
        productos[producto_index]['subcategoria'] = request.form.get('productSubcategory', productos[producto_index]['subcategoria'])
        
        imagen = request.files.get('productImage')
        if imagen and imagen.filename:
            eliminar_imagen_antigua(imagen_anterior)
            filename = limpiar_nombre_archivo(imagen.filename)
            unique_filename = f"{int(time.time())}_{filename}"
            imagen_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            imagen.save(imagen_path)
            productos[producto_index]['imagen'] = f"images/{unique_filename}"
        
        guardar_productos(productos)
        return jsonify({'success': True, 'producto': productos[producto_index]})
    except Exception as e:
        print(f"Error al actualizar producto: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/productos/<int:producto_id>', methods=['DELETE'])
@login_required
def api_delete_producto(producto_id):
    try:
        productos = cargar_productos()
        producto = next((p for p in productos if p['id'] == producto_id), None)
        
        if producto:
            eliminar_imagen_antigua(producto['imagen'])
            productos = [p for p in productos if p['id'] != producto_id]
            guardar_productos(productos)
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'message': 'Producto no encontrado'})
    except Exception as e:
        print(f"Error al eliminar producto: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

# === API CATEGORÍAS Y FILTROS ===

@app.route('/admin/api/categorias', methods=['GET'])
@login_required
def api_get_categorias():
    categorias_data = cargar_categorias()
    return jsonify(categorias_data)

@app.route('/admin/api/categorias', methods=['POST'])
@login_required
def api_add_categoria():
    try:
        data = request.get_json()
        categoria_id = data.get('id')
        categoria_nombre = data.get('nombre')
        
        if not categoria_id or not categoria_nombre:
            return jsonify({'success': False, 'message': 'ID y nombre son requeridos'})
        
        categorias_data = cargar_categorias()
        
        if any(cat['id'] == categoria_id for cat in categorias_data['categorias']):
            return jsonify({'success': False, 'message': 'Ya existe una categoría con este ID'})
        
        categorias_data['categorias'].append({
            'id': categoria_id,
            'nombre': categoria_nombre
        })
        
        if categoria_id not in categorias_data['filtros']:
            categorias_data['filtros'][categoria_id] = []
        
        guardar_categorias(categorias_data)
        return jsonify({'success': True, 'message': 'Categoría agregada correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/categorias/<categoria_id>', methods=['PUT'])
@login_required
def api_update_categoria(categoria_id):
    try:
        data = request.get_json()
        categoria_nombre = data.get('nombre')
        
        if not categoria_nombre:
            return jsonify({'success': False, 'message': 'Nombre es requerido'})
        
        categorias_data = cargar_categorias()
        
        for cat in categorias_data['categorias']:
            if cat['id'] == categoria_id:
                cat['nombre'] = categoria_nombre
                break
        
        guardar_categorias(categorias_data)
        return jsonify({'success': True, 'message': 'Categoría actualizada correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/categorias/<categoria_id>', methods=['DELETE'])
@login_required
def api_delete_categoria(categoria_id):
    try:
        if categoria_id == 'todos':
            return jsonify({'success': False, 'message': 'No se puede eliminar la categoría "Todos"'})
        
        categorias_data = cargar_categorias()
        
        categorias_data['categorias'] = [cat for cat in categorias_data['categorias'] if cat['id'] != categoria_id]
        
        if categoria_id in categorias_data['filtros']:
            del categorias_data['filtros'][categoria_id]
        
        productos = cargar_productos()
        for producto in productos:
            if producto['categoria'] == categoria_id:
                producto['categoria'] = 'todos'
                producto['subcategoria'] = ''
        guardar_productos(productos)
        
        guardar_categorias(categorias_data)
        return jsonify({'success': True, 'message': 'Categoría eliminada correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/filtros/<categoria_id>', methods=['POST'])
@login_required
def api_add_filtro(categoria_id):
    try:
        data = request.get_json()
        filtro_nombre = data.get('nombre')
        
        if not filtro_nombre:
            return jsonify({'success': False, 'message': 'Nombre es requerido'})
        
        categorias_data = cargar_categorias()
        
        if categoria_id not in categorias_data['filtros']:
            categorias_data['filtros'][categoria_id] = []
        
        if filtro_nombre in categorias_data['filtros'][categoria_id]:
            return jsonify({'success': False, 'message': 'Ya existe un filtro con este nombre'})
        
        categorias_data['filtros'][categoria_id].append(filtro_nombre)
        
        guardar_categorias(categorias_data)
        return jsonify({'success': True, 'message': 'Filtro agregado correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/api/filtros/<categoria_id>/<filtro_name>', methods=['DELETE'])
@login_required
def api_delete_filtro(categoria_id, filtro_name):
    try:
        categorias_data = cargar_categorias()
        
        if categoria_id in categorias_data['filtros']:
            categorias_data['filtros'][categoria_id] = [
                f for f in categorias_data['filtros'][categoria_id] if f != filtro_name
            ]
        
        productos = cargar_productos()
        for producto in productos:
            if producto['categoria'] == categoria_id and producto['subcategoria'] == filtro_name:
                producto['subcategoria'] = ''
        guardar_productos(productos)
        
        guardar_categorias(categorias_data)
        return jsonify({'success': True, 'message': 'Filtro eliminado correctamente'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# === NUEVA RUTA PARA EDITAR FILTROS ===
@app.route('/admin/api/filtros/<categoria_id>/<filtro_name>', methods=['PUT'])
@login_required
def api_update_filtro(categoria_id, filtro_name):
    try:
        data = request.get_json()
        nuevo_nombre = data.get('nombre')

        if not nuevo_nombre:
            return jsonify({'success': False, 'message': 'El nombre es requerido'})

        categorias_data = cargar_categorias()

        if categoria_id not in categorias_data['filtros']:
            return jsonify({'success': False, 'message': 'Categoría no encontrada'})

        filtros = categorias_data['filtros'][categoria_id]
        if filtro_name in filtros:
            index = filtros.index(filtro_name)
            filtros[index] = nuevo_nombre

            # Actualizar productos que usan este filtro
            productos = cargar_productos()
            for producto in productos:
                if producto['categoria'] == categoria_id and producto['subcategoria'] == filtro_name:
                    producto['subcategoria'] = nuevo_nombre
            guardar_productos(productos)

            guardar_categorias(categorias_data)
            return jsonify({'success': True, 'message': 'Filtro actualizado correctamente'})
        else:
            return jsonify({'success': False, 'message': 'Filtro no encontrado'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# === OTRAS RUTAS ===

@app.route('/api/categorias', methods=['GET'])
def get_categorias_frontend():
    try:
        categorias_data = cargar_categorias()
        return jsonify(categorias_data)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/recargar-categorias', methods=['POST'])
def recargar_categorias():
    try:
        return jsonify({'success': True, 'message': 'Categorías actualizadas'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/check-admin-status')
def check_admin_status():
    return jsonify({'is_admin': session.get('logged_in', False)})

if __name__ == '__main__':
    cargar_productos()
    cargar_categorias()
    app.run(debug=True, port=5000)