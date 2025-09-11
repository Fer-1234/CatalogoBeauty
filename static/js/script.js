document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const dropdownToggle = document.getElementById('dropdownToggle');
    const dropdownContent = document.getElementById('dropdownContent');
    const categoryFilters = document.querySelectorAll('.category-filter');
    const productsGrid = document.getElementById('productsGrid');
    const cartIcon = document.getElementById('cartIcon');
    const cartCount = document.getElementById('cartCount');
    const cartModal = document.getElementById('cartModal');
    const closeModal = document.getElementById('closeModal');
    const orderItems = document.getElementById('orderItems');
    const orderTotal = document.getElementById('orderTotal');
    const confirmOrder = document.getElementById('confirmOrder');
    const continueShopping = document.getElementById('continueShopping');
    const resultsCount = document.getElementById('resultsCount');
    const currentCategory = document.getElementById('currentCategory');
    const toast = document.getElementById('toast');
    
    // Carrito de compras
    let cart = [];
    
    // Inicializar carruseles
    initProductCarousels();
    
    // Toggle dropdown menu
    dropdownToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!dropdownToggle.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('show');
        }
    });
    
    // Función para mostrar notificación toast
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Filtrar por categoría
    categoryFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            const category = this.dataset.category;
            const categoryName = this.textContent;
            
            // Marcar filtro activo
            categoryFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            
            // Actualizar categoría actual
            if (category === 'todos') {
                currentCategory.textContent = 'Productos de belleza';
            } else {
                currentCategory.textContent = categoryName;
            }
            
            fetch('/filtrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `categoria=${category}`
            })
            .then(response => response.json())
            .then(productos => {
                // Actualizar grid de productos
                productsGrid.innerHTML = '';
                productos.forEach(producto => {
                    const productCard = createProductCard(producto);
                    productsGrid.appendChild(productCard);
                });
                
                // Actualizar contador de resultados
                resultsCount.textContent = `${productos.length} resultados`;
                
                // Reasignar eventos a los botones de agregar al carrito
                assignAddToCartEvents();
                
                // Inicializar carruseles para los nuevos productos
                initProductCarousels();
                
                // Cerrar dropdown
                dropdownContent.classList.remove('show');
            })
            .catch(error => console.error('Error:', error));
        });
    });
    
    // Función para crear tarjeta de producto
    function createProductCard(producto) {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.category = producto.categoria;
        
        // Construir el contenido HTML para la imagen (soporte para múltiples imágenes)
        let imageHTML = '';
        if (producto.imagenes && producto.imagenes.length > 1) {
            // Producto con múltiples imágenes (carrusel)
            imageHTML = `<div class="product-image">`;
            producto.imagenes.forEach((imagen, index) => {
                imageHTML += `<img src="/static/images/products/${imagen}" alt="${producto.nombre}" ${index === 0 ? 'style="opacity: 1"' : 'style="opacity: 0; position: absolute; top: 0; left: 0;"'}>`;
            });
            imageHTML += `</div>`;
        } else {
            // Producto con una sola imagen
            const mainImage = producto.imagen_principal || (producto.imagenes ? producto.imagenes[0] : producto.imagen);
            imageHTML = `
                <div class="product-image">
                    <img src="/static/images/products/${mainImage}" alt="${producto.nombre}">
                </div>
            `;
        }
        
        productCard.innerHTML = `
            ${imageHTML}
            <div class="product-info">
                <h3>${producto.nombre}</h3>
                <p class="price">$${producto.precio}</p>
                <button class="add-to-cart" data-id="${producto.id}" data-name="${producto.nombre}" data-price="${producto.precio}">
                    <i class="fas fa-cart-plus"></i> Agregar al carrito
                </button>
            </div>
        `;
        
        return productCard;
    }
    
    // Función para inicializar carruseles de productos
    function initProductCarousels() {
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const images = card.querySelectorAll('.product-image img');
            if (images.length > 1) {
                initCarousel(card, images);
            }
        });
    }
    
    function initCarousel(card, images) {
        let currentIndex = 0;
        const imageContainer = card.querySelector('.product-image');
        
        // Crear indicadores
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        
        images.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
            indicator.addEventListener('click', () => goToSlide(index));
            indicators.appendChild(indicator);
        });
        
        imageContainer.appendChild(indicators);
        
        // Función para cambiar slide
        function goToSlide(index) {
            currentIndex = index;
            images.forEach((img, i) => {
                img.style.opacity = i === index ? '1' : '0';
                img.style.zIndex = i === index ? '1' : '0';
            });
            
            // Actualizar indicadores
            indicators.querySelectorAll('.carousel-indicator').forEach((ind, i) => {
                ind.classList.toggle('active', i === index);
            });
        }
        
        // Cambio automático cada 3 segundos
        let carouselInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length;
            goToSlide(currentIndex);
        }, 3000);
        
        // Pausar al hacer hover
        card.addEventListener('mouseenter', () => clearInterval(carouselInterval));
        card.addEventListener('mouseleave', () => {
            carouselInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                goToSlide(currentIndex);
            }, 3000);
        });
        
        // Inicializar
        images.forEach((img, i) => {
            img.style.transition = 'opacity 0.5s ease';
            img.style.opacity = i === 0 ? '1' : '0';
            img.style.position = i === 0 ? 'relative' : 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
        });
        
        imageContainer.style.position = 'relative';
    }
    
    // Función para asignar eventos a los botones de agregar al carrito
    function assignAddToCartEvents() {
        const addToCartButtons = document.querySelectorAll('.add-to-cart');
        addToCartButtons.forEach(button => {
            button.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                const price = parseFloat(this.dataset.price);
                
                // Verificar si el producto ya está en el carrito
                const existingItem = cart.find(item => item.id === id);
                
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({
                        id,
                        name,
                        price,
                        quantity: 1
                    });
                }
                
                // Actualizar contador del carrito
                updateCartCount();
                
                // Mostrar mensaje flotante
                showToast(`¡${name} agregado al carrito!`);
            });
        });
    }
    
    // Actualizar contador del carrito
    function updateCartCount() {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
    
    // Abrir modal del carrito
    cartIcon.addEventListener('click', function() {
        openCartModal();
    });
    
    // Función para abrir el modal del carrito
    function openCartModal() {
        // Limpiar items anteriores
        orderItems.innerHTML = '';
        
        if (cart.length === 0) {
            orderItems.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-bag"></i><p>No hay productos en el carrito</p></div>';
            orderTotal.textContent = '$0.00';
        } else {
            let total = 0;
            
            cart.forEach((item, index) => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                
                const itemElement = document.createElement('div');
                itemElement.className = 'order-item';
                itemElement.innerHTML = `
                    <div class="order-item-info">
                        <h4>${item.name}</h4>
                        <p class="order-item-details">$${item.price} c/u</p>
                        <p class="order-item-details">${item.quantity} + $${itemTotal.toFixed(2)}</p>
                    </div>
                    <div class="order-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease-btn" data-index="${index}">-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                        </div>
                        <button class="remove-item" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                orderItems.appendChild(itemElement);
            });
            
            // Asignar eventos a los botones de cantidad
            assignQuantityEvents();
            
            // Actualizar total
            orderTotal.textContent = `$${total.toFixed(2)}`;
        }
        
        // Mostrar modal
        cartModal.style.display = 'block';
    }
    
    // Asignar eventos a los botones de cantidad en el carrito
    function assignQuantityEvents() {
        // Botones de aumentar cantidad
        document.querySelectorAll('.increase-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cart[index].quantity += 1;
                updateCartCount();
                openCartModal(); // Recargar el modal para reflejar cambios
            });
        });
        
        // Botones de disminuir cantidad
        document.querySelectorAll('.decrease-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                if (cart[index].quantity > 1) {
                    cart[index].quantity -= 1;
                } else {
                    // Si la cantidad es 1, eliminar el producto
                    cart.splice(index, 1);
                }
                updateCartCount();
                openCartModal(); // Recargar el modal para reflejar cambios
            });
        });
        
        // Botones de eliminar producto
        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cart.splice(index, 1);
                updateCartCount();
                openCartModal(); // Recargar el modal para reflejar cambios
            });
        });
    }
    
    // Cerrar modal
    closeModal.addEventListener('click', function() {
        cartModal.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
    
    // Continuar comprando
    continueShopping.addEventListener('click', function() {
        cartModal.style.display = 'none';
    });
    
    // Enviar pedido por WhatsApp
    confirmOrder.addEventListener('click', function() {
        if (cart.length === 0) {
            showToast('El carrito está vacío');
            return;
        }
        
        // Crear mensaje para WhatsApp
        let message = "¡Hola! Quiero realizar el siguiente pedido:%0A%0A";
        message += "*Fecha:* " + new Date().toLocaleDateString() + "%0A%0A";
        message += "*Detalles del pedido:*%0A%0A";
        
        let total = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            message += `- ${item.name}%0A  Cantidad: ${item.quantity}%0A  Precio: $${item.price}%0A%0A`;
        });
        
        // Agregar total
        message += `*Total:* $${total.toFixed(2)}%0A%0A`;
        message += "Por favor confirmar disponibilidad.";
        
        // Número de WhatsApp (reemplaza con el número real)
        const phoneNumber = "1234567890";
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
        
        // Vaciar carrito después de enviar
        cart = [];
        updateCartCount();
        
        // Cerrar modal
        cartModal.style.display = 'none';
        
        // Mostrar mensaje de confirmación
        showToast('Pedido enviado por WhatsApp. Nos comunicaremos pronto para confirmar.');
    });
    
    // Inicializar eventos
    assignAddToCartEvents();
});