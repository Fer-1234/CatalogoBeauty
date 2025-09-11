from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import os
import uuid

app = Flask(__name__)
import os
app.secret_key = os.environ.get('SECRET_KEY', 'clave_secreta_beauty_2023')
app.config['UPLOAD_FOLDER'] = 'static/images/products'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Asegurar que la carpeta de uploads existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Cargar datos desde archivos JSON
def cargar_datos(archivo):
    try:
        with open(archivo, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def guardar_datos(archivo, datos):
    with open(archivo, 'w', encoding='utf-8') as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)

# Credenciales de administrador
ADMIN_CREDENTIALS = {
    'usuario': 'Sinergia',
    'contrasena': 'Kairos1'
}

# Extensiones permitidas
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    productos = cargar_datos('productos.json')
    categorias = cargar_datos('categorias.json')
    return render_template('index.html', productos=productos, categorias=categorias)

@app.route('/admin-to-store')
def admin_to_store():
    if session.get('admin_logueado'):
        session['admin_browsing'] = True
    return redirect(url_for('index'))

@app.route('/store-to-admin')
def store_to_admin():
    # Redirigir al login si no está logueado
    if not session.get('admin_logueado'):
        return redirect(url_for('login'))
    return redirect(url_for('admin_panel'))

@app.route('/filtrar', methods=['POST'])
def filtrar_productos():
    productos = cargar_datos('productos.json')
    categoria = request.form.get('categoria', '')
    
    if categoria and categoria != 'todos':
        productos_filtrados = [p for p in productos if p['categoria'] == categoria]
    else:
        productos_filtrados = productos
        
    return jsonify(productos_filtrados)

@app.route('/realizar-pedido', methods=['POST'])
def realizar_pedido():
    data = request.get_json()
    print("Pedido recibido:", data)
    return jsonify({"status": "success", "message": "Pedido recibido correctamente"})

@app.route('/check-admin')
def check_admin():
    return jsonify({'isAdmin': session.get('admin_logueado', False)})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('admin_logueado'):
        return redirect(url_for('admin_panel'))

    if request.method == 'POST':
        usuario = request.form.get('usuario')
        contrasena = request.form.get('contrasena')
        if usuario == ADMIN_CREDENTIALS['usuario'] and contrasena == ADMIN_CREDENTIALS['contrasena']:
            session['admin_logueado'] = True
            return jsonify({'success': True, 'message': 'Inicio de sesión exitoso'})
        else:
            return jsonify({'success': False, 'message': 'Credenciales incorrectas'})

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_logueado', None)
    session.pop('admin_browsing', None)
    return redirect(url_for('index'))

@app.route('/admin')
def admin_panel():
    if not session.get('admin_logueado'):
        return redirect(url_for('login'))
    
    productos = cargar_datos('productos.json')
    categorias = cargar_datos('categorias.json')
    return render_template('admin.html', productos=productos, categorias=categorias)

# Gestión de Productos
@app.route('/agregar-producto', methods=['POST'])
def agregar_producto():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        datos = request.form
        productos = cargar_datos('productos.json')
        
        # Generar nuevo ID
        nuevo_id = max([p['id'] for p in productos], default=0) + 1
        
        nuevo_producto = {
            'id': nuevo_id,
            'nombre': datos.get('nombre'),
            'precio': float(datos.get('precio')),
            'categoria': datos.get('categoria'),
            'imagenes': [],
            'imagen_principal': ''
        }
        
        productos.append(nuevo_producto)
        guardar_datos('productos.json', productos)
        
        return jsonify({'success': True, 'message': 'Producto agregado correctamente', 'id': nuevo_id})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/actualizar-producto', methods=['POST'])
def actualizar_producto():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        producto_id = int(request.form.get('id'))
        nuevo_nombre = request.form.get('nombre')
        nuevo_precio = float(request.form.get('precio'))
        nueva_categoria = request.form.get('categoria')
        
        productos = cargar_datos('productos.json')
        
        for producto in productos:
            if producto['id'] == producto_id:
                producto['nombre'] = nuevo_nombre
                producto['precio'] = nuevo_precio
                producto['categoria'] = nueva_categoria
                break
        
        guardar_datos('productos.json', productos)
        return jsonify({'success': True, 'message': 'Producto actualizado correctamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/eliminar-producto', methods=['POST'])
def eliminar_producto():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        producto_id = int(request.form.get('id'))
        
        productos = cargar_datos('productos.json')
        producto = next((p for p in productos if p['id'] == producto_id), None)
        
        if producto:
            # Eliminar imágenes físicas
            for imagen in producto.get('imagenes', []):
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], imagen)
                if os.path.exists(filepath):
                    os.remove(filepath)
            
            # Eliminar producto
            productos = [p for p in productos if p['id'] != producto_id]
            guardar_datos('productos.json', productos)
            
            return jsonify({'success': True, 'message': 'Producto eliminado correctamente'})
        else:
            return jsonify({'success': False, 'message': 'Producto no encontrado'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# Gestión de Imágenes
@app.route('/upload-image', methods=['POST'])
def upload_image():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        producto_id = int(request.form.get('product_id'))
        file = request.files.get('image')
        
        if not file or not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Archivo no válido'})
        
        # Generar nombre único para la imagen
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Actualizar producto con nueva imagen
        productos = cargar_datos('productos.json')
        for producto in productos:
            if producto['id'] == producto_id:
                if 'imagenes' not in producto:
                    producto['imagenes'] = []
                producto['imagenes'].append(filename)
                
                # Si es la primera imagen, establecer como principal
                if len(producto['imagenes']) == 1:
                    producto['imagen_principal'] = filename
                
                break
        
        guardar_datos('productos.json', productos)
        return jsonify({'success': True, 'message': 'Imagen subida correctamente', 'filename': filename})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/set-main-image', methods=['POST'])
def set_main_image():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        producto_id = int(request.form.get('product_id'))
        imagen_nombre = request.form.get('image_name')
        
        productos = cargar_datos('productos.json')
        for producto in productos:
            if producto['id'] == producto_id:
                producto['imagen_principal'] = imagen_nombre
                break
        
        guardar_datos('productos.json', productos)
        return jsonify({'success': True, 'message': 'Imagen principal actualizada'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/delete-image', methods=['POST'])
def delete_image():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        producto_id = int(request.form.get('product_id'))
        imagen_nombre = request.form.get('image_name')
        
        productos = cargar_datos('productos.json')
        for producto in productos:
            if producto['id'] == producto_id:
                if 'imagenes' in producto and imagen_nombre in producto['imagenes']:
                    producto['imagenes'].remove(imagen_nombre)
                    
                    # Eliminar archivo físico
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], imagen_nombre)
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    
                    # Si era la imagen principal, elegir una nueva
                    if producto.get('imagen_principal') == imagen_nombre:
                        producto['imagen_principal'] = producto['imagenes'][0] if producto['imagenes'] else ''
                
                break
        
        guardar_datos('productos.json', productos)
        return jsonify({'success': True, 'message': 'Imagen eliminada correctamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

# Gestión de Categorías
@app.route('/agregar-categoria', methods=['POST'])
def agregar_categoria():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        nombre = request.form.get('nombre')
        icono = request.form.get('icono', 'fas fa-tag')
        
        categorias = cargar_datos('categorias.json')
        
        # Verificar si la categoría ya existe
        if any(c['nombre'].lower() == nombre.lower() for c in categorias):
            return jsonify({'success': False, 'message': 'La categoría ya existe'})
        
        nueva_categoria = {
            'id': len(categorias) + 1,
            'nombre': nombre,
            'icono': icono
        }
        
        categorias.append(nueva_categoria)
        guardar_datos('categorias.json', categorias)
        
        return jsonify({'success': True, 'message': 'Categoría agregada correctamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/actualizar-categoria', methods=['POST'])
def actualizar_categoria():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        categoria_id = int(request.form.get('id'))
        nuevo_nombre = request.form.get('nombre')
        nuevo_icono = request.form.get('icono')
        
        categorias = cargar_datos('categorias.json')
        productos = cargar_datos('productos.json')
        
        for categoria in categorias:
            if categoria['id'] == categoria_id:
                # Actualizar nombre en productos
                for producto in productos:
                    if producto['categoria'] == categoria['nombre']:
                        producto['categoria'] = nuevo_nombre
                
                categoria['nombre'] = nuevo_nombre
                categoria['icono'] = nuevo_icono
                break
        
        guardar_datos('categorias.json', categorias)
        guardar_datos('productos.json', productos)
        
        return jsonify({'success': True, 'message': 'Categoría actualizada correctamente'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/eliminar-categoria', methods=['POST'])
def eliminar_categoria():
    if not session.get('admin_logueado'):
        return jsonify({'success': False, 'message': 'No autorizado'})
    
    try:
        categoria_id = int(request.form.get('id'))
        
        categorias = cargar_datos('categorias.json')
        productos = cargar_datos('productos.json')
        
        categoria = next((c for c in categorias if c['id'] == categoria_id), None)
        
        if categoria:
            # Verificar si hay productos en esta categoría
            productos_en_categoria = [p for p in productos if p['categoria'] == categoria['nombre']]
            
            if productos_en_categoria:
                return jsonify({
                    'success': False, 
                    'message': f'No se puede eliminar. Hay {len(productos_en_categoria)} productos en esta categoría.'
                })
            
            # Eliminar categoría
            categorias = [c for c in categorias if c['id'] != categoria_id]
            guardar_datos('categorias.json', categorias)
            
            return jsonify({'success': True, 'message': 'Categoría eliminada correctamente'})
        else:
            return jsonify({'success': False, 'message': 'Categoría no encontrada'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True)