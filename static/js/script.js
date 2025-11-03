document.addEventListener('DOMContentLoaded', function() {
    console.log('Script cargado correctamente');
    
    // Variables globales
    let cart = [];
    let selectedFilters = [];
    let currentCategoryKey = 'todos';
    let categoriasData = {};
    let subcategoriasData = {};

    // Estado persistente
    let lastSelectedCategory = localStorage.getItem('lastCategory') || 'todos';
    let lastSelectedFilters = JSON.parse(localStorage.getItem('lastFilters')) || [];

    // Inicialización
    init();

    function init() {
        console.log('Inicializando aplicación');
        
        // Cargar categorías dinámicamente desde el servidor
        loadCategoriesFromServer();
        setupEventListeners();
        
        // Ocultar botón de filtros inicialmente
        const filterToggle = document.getElementById('filterToggle');
        if (filterToggle) {
            filterToggle.style.display = 'none';
        }
        
        // Restaurar estado anterior
        restorePreviousState();
    }

    function loadCategoriesFromServer() {
        fetch('/api/categorias')
            .then(response => response.json())
            .then(data => {
                categoriasData = data;
                renderCategoryFilters(data.categorias);
                // Cargar productos después de tener las categorías
                loadProducts(currentCategoryKey);
            })
            .catch(error => {
                console.error('Error cargando categorías:', error);
                // Cargar categorías por defecto del HTML como fallback
                loadInitialCategories();
                loadProducts(currentCategoryKey);
            });
    }

    function renderCategoryFilters(categorias) {
        const dropdownContent = document.getElementById('dropdownContent');
        if (!dropdownContent) return;
        
        // Limpiar contenido existente
        dropdownContent.innerHTML = '';
        
        const categoryFiltersContainer = document.createElement('div');
        categoryFiltersContainer.className = 'category-filters';
        
        // Crear botones para cada categoría
        categorias.forEach(categoria => {
            const button = document.createElement('button');
            button.className = 'category-filter';
            if (categoria.id === currentCategoryKey || (categoria.id === 'todos' && currentCategoryKey === 'todos')) {
                button.classList.add('active');
            }
            button.dataset.category = categoria.id;
            button.textContent = categoria.nombre;
            
            button.addEventListener('click', handleCategoryFilter);
            categoryFiltersContainer.appendChild(button);
        });
        
        dropdownContent.appendChild(categoryFiltersContainer);
    }

    function restorePreviousState() {
        // Restaurar categoría seleccionada
        if (lastSelectedCategory && lastSelectedCategory !== 'todos') {
            const categoryButton = document.querySelector(`.category-filter[data-category="${lastSelectedCategory}"]`);
            if (categoryButton) {
                // Actualizar la UI para reflejar la categoría activa
                document.querySelectorAll('.category-filter').forEach(f => f.classList.remove('active'));
                categoryButton.classList.add('active');
                
                const currentCategory = document.getElementById('currentCategory');
                if (currentCategory) {
                    currentCategory.textContent = categoryButton.textContent;
                }
                
                currentCategoryKey = lastSelectedCategory;
                
                // Mostrar botón de filtros
                const filterToggle = document.getElementById('filterToggle');
                if (filterToggle) {
                    filterToggle.style.display = 'flex';
                }
            }
        }
        
        // Restaurar filtros seleccionados
        selectedFilters = lastSelectedFilters;
    }

    function loadInitialCategories() {
        // Usar las categorías que ya están en el HTML como fallback
        const categoryButtons = document.querySelectorAll('.category-filter');
        categoryButtons.forEach(button => {
            button.addEventListener('click', handleCategoryFilter);
        });
    }

    function setupEventListeners() {
        console.log('Configurando event listeners');
        
        // Dropdown - Mantener abierto hasta que se haga clic fuera
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownContent = document.getElementById('dropdownContent');
        
        if (dropdownToggle && dropdownContent) {
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });
        }

        // Cerrar dropdown al hacer clic fuera o al seleccionar una categoría
        document.addEventListener('click', function(e) {
            // Cerrar dropdown si se hace clic fuera
            if (dropdownContent && dropdownContent.classList.contains('show') && 
                !dropdownContent.contains(e.target) && 
                !dropdownToggle.contains(e.target)) {
                dropdownContent.classList.remove('show');
            }
            
            // Cerrar dropdown si se hace clic en una categoría
            if (e.target.classList.contains('category-filter')) {
                if (dropdownContent) {
                    dropdownContent.classList.remove('show');
                }
            }
        });

        // Carrito
        const cartIcon = document.getElementById('cartIcon');
        const closeModal = document.getElementById('closeModal');
        const continueShopping = document.getElementById('continueShopping');
        const confirmOrder = document.getElementById('confirmOrder');
        
        if (cartIcon) cartIcon.addEventListener('click', openCartModal);
        if (closeModal) closeModal.addEventListener('click', closeCartModal);
        if (continueShopping) continueShopping.addEventListener('click', closeCartModal);
        if (confirmOrder) confirmOrder.addEventListener('click', sendWhatsAppOrder);

        // Filtros
        const filterToggle = document.getElementById('filterToggle');
        const closeFilters = document.getElementById('closeFilters');
        const applyFilters = document.getElementById('applyFilters');
        const clearFilters = document.getElementById('clearFilters');
        
        if (filterToggle) filterToggle.addEventListener('click', openFiltersModal);
        if (closeFilters) closeFilters.addEventListener('click', closeFiltersModal);
        if (applyFilters) applyFilters.addEventListener('click', applyFiltersHandler);
        if (clearFilters) clearFilters.addEventListener('click', clearFiltersHandler);

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', closeModalsOutside);
    }

    function handleCategoryFilter() {
        selectedFilters = [];
        localStorage.setItem('lastFilters', JSON.stringify(selectedFilters));
    



        const category = this.dataset.category;
        const categoryName = this.textContent;

        console.log('Categoría seleccionada:', category);

        // Guardar en localStorage
        localStorage.setItem('lastCategory', category);
        currentCategoryKey = category;

        // Marcar filtro activo
        document.querySelectorAll('.category-filter').forEach(f => f.classList.remove('active'));
        this.classList.add('active');

        // Actualizar categoría actual
        const currentCategory = document.getElementById('currentCategory');
        if (currentCategory) {
            currentCategory.textContent = categoryName;
        }

        // Mostrar/ocultar botón de filtros
        const filterToggle = document.getElementById('filterToggle');
        if (filterToggle) {
            filterToggle.style.display = category === 'todos' ? 'none' : 'flex';
            filterToggle.classList.toggle('show', category !== 'todos');
        }

        // Cerrar el dropdown al seleccionar una categoría
        const dropdownContent = document.getElementById('dropdownContent');
        if (dropdownContent) {
            dropdownContent.classList.remove('show');
        }

        // Cargar productos
        loadProducts(category);
    }

    function loadProducts(category) {
        console.log('Cargando productos para categoría:', category);
        
        fetch('/filtrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `categoria=${category}`
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar productos');
            }
            return response.json();
        })
        .then(productos => {
            console.log('Productos recibidos:', productos.length);
            
            let productosFiltrados = productos;
            if (selectedFilters.length > 0 && category !== 'todos') {
                productosFiltrados = productos.filter(producto => 
                    selectedFilters.includes(producto.subcategoria)
                );
            }
            
            renderProductsGrid(productosFiltrados);
            
            const resultsCount = document.getElementById('resultsCount');
            if (resultsCount) {
                resultsCount.textContent = `${productosFiltrados.length} resultados`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Error al cargar los productos');
        });
    }

    function renderProductsGrid(productos) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;
        
        productsGrid.innerHTML = '';
        
        if (productos.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron productos</h3>
                    <p>Intenta con otros filtros o categorías</p>
                </div>
            `;
            return;
        }
        
        productos.forEach(producto => {
            // Usar la ruta correcta para las imágenes
            let imagePath = obtenerRutaImagen(producto.imagen);
            
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.category = producto.categoria;
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${imagePath}" alt="${producto.nombre}" 
                         onerror="this.onerror=null; this.src='/static/images/default-product.jpg'">
                </div>
                <div class="product-info">
                    <h3>${producto.nombre}</h3>
                    <p class="price">$${producto.precio}</p>
                    <button class="add-to-cart" data-id="${producto.id}" 
                            data-name="${producto.nombre}" data-price="${producto.precio}">
                        <i class="fas fa-cart-plus"></i> Agregar al carrito
                    </button>
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
        
        // Reasignar eventos
        assignAddToCartEvents();
    }

    function obtenerRutaImagen(imagenPath) {
        if (!imagenPath) return '/static/images/default-product.jpg';
        
        if (imagenPath.startsWith('http')) {
            return imagenPath;
        }
        
        if (imagenPath.startsWith('images/')) {
            return `/static/${imagenPath}`;
        }
        
        if (!imagenPath.includes('/')) {
            return `/static/images/${imagenPath}`;
        }
        
        return `/static/${imagenPath}`;
    }

    function assignAddToCartEvents() {
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                const id = this.dataset.id;
                const name = this.dataset.name;
                const price = parseFloat(this.dataset.price);
                
                const existingItem = cart.find(item => item.id === id);
                
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({ id, name, price, quantity: 1 });
                }
                
                updateCartCount();
                showToast(`¡${name} agregado al carrito!`);
            });
        });
    }

    function updateCartCount() {
        const cartCount = document.getElementById('cartCount');
        if (!cartCount) return;
        
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }

    function openCartModal() {
        const orderItems = document.getElementById('orderItems');
        const cartModal = document.getElementById('cartModal');
        
        if (!orderItems || !cartModal) return;
        
        orderItems.innerHTML = '';
        
        if (cart.length === 0) {
            orderItems.innerHTML = '<p class="empty-cart">No hay productos en el carrito</p>';
            
            const orderTotal = document.getElementById('orderTotal');
            if (orderTotal) {
                orderTotal.textContent = '$0.00';
            }
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
            
            assignQuantityEvents();
            
            const orderTotal = document.getElementById('orderTotal');
            if (orderTotal) {
                orderTotal.textContent = `$${total.toFixed(2)}`;
            }
        }
        
        cartModal.style.display = 'block';
    }

    function assignQuantityEvents() {
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cart[index].quantity += 1;
                updateCartCount();
                openCartModal();
            });
        });
        
        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                if (cart[index].quantity > 1) {
                    cart[index].quantity -= 1;
                } else {
                    cart.splice(index, 1);
                }
                updateCartCount();
                openCartModal();
            });
        });
        
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                cart.splice(index, 1);
                updateCartCount();
                openCartModal();
            });
        });
    }

    function closeCartModal() {
        const cartModal = document.getElementById('cartModal');
        if (cartModal) {
            cartModal.style.display = 'none';
        }
    }

    function sendWhatsAppOrder() {
        if (cart.length === 0) {
            showToast('El carrito está vacío');
            return;
        }

        let message = "¡Hola! Quiero realizar el siguiente pedido:\n\n";
        message += "*Fecha:* " + new Date().toLocaleDateString() + "\n\n";
        message += "*Detalles del pedido:*\n\n";

        let total = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            message += `- ${item.name}\n  Cantidad: ${item.quantity}\n  Precio: $${item.price}\n\n`;
        });

        message += `*Total:* $${total.toFixed(2)}\n\n`;
        message += "Por favor confirmar disponibilidad.";

        const phoneNumber = "+529221595520"; // ⚠️ Reemplaza con tu número real
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');

        cart = [];
        updateCartCount();
        closeCartModal();
        showToast('Pedido enviado por WhatsApp. Nos comunicaremos pronto para confirmar.');
    }

    function openFiltersModal() {
        const subcategoriesContainer = document.getElementById('subcategoriesContainer');
        const currentFilterCategory = document.getElementById('currentFilterCategory');
        const filterResultsCount = document.getElementById('filterResultsCount');
        const filtersModal = document.getElementById('filtersModal');
        const currentCategory = document.getElementById('currentCategory');
        const resultsCount = document.getElementById('resultsCount');
        
        if (!subcategoriesContainer || !currentFilterCategory || !filterResultsCount || !filtersModal) return;
        
        if (currentCategory) {
            currentFilterCategory.textContent = currentCategory.textContent;
        }
        
        if (resultsCount) {
            filterResultsCount.textContent = resultsCount.textContent;
        }
        
        subcategoriesContainer.innerHTML = '';
        
        // Cargar subcategorías para la categoría actual
        loadSubcategoriesForCategory(currentCategoryKey);
        
        filtersModal.style.display = 'block';
    }

    function loadSubcategoriesForCategory(category) {
        const subcategoriesContainer = document.getElementById('subcategoriesContainer');
        if (!subcategoriesContainer) return;
        
        // Usar los datos de categorías ya cargados
        if (categoriasData && categoriasData.filtros) {
            renderSubcategoryOptions(category, categoriasData.filtros);
        } else {
            // Si no hay datos cargados, hacer fetch
            fetch('/api/categorias')
                .then(response => response.json())
                .then(data => {
                    categoriasData = data;
                    renderSubcategoryOptions(category, data.filtros);
                })
                .catch(error => {
                    console.error('Error cargando subcategorías:', error);
                });
        }
    }

    function renderSubcategoryOptions(category, filtrosData) {
        const subcategoriesContainer = document.getElementById('subcategoriesContainer');
        
        if (category !== 'todos' && filtrosData[category]) {
            const subcategoryGroup = document.createElement('div');
            subcategoryGroup.className = 'subcategory-group';
            
            const groupTitle = document.createElement('h4');
            groupTitle.textContent = `Filtrar por ${getCategoryName(category)}`;
            subcategoryGroup.appendChild(groupTitle);
            
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'subcategory-options';
            
            filtrosData[category].forEach(subcat => {
                const option = document.createElement('div');
                option.className = 'subcategory-option';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `filter-${subcat.toLowerCase().replace(/\s+/g, '-')}`;
                checkbox.value = subcat;
                checkbox.checked = selectedFilters.includes(subcat);
                
                const label = document.createElement('label');
                label.htmlFor = `filter-${subcat.toLowerCase().replace(/\s+/g, '-')}`;
                label.textContent = subcat;
                
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        if (!selectedFilters.includes(this.value)) {
                            selectedFilters.push(this.value);
                        }
                    } else {
                        selectedFilters = selectedFilters.filter(f => f !== this.value);
                    }
                });
                
                option.appendChild(checkbox);
                option.appendChild(label);
                optionsContainer.appendChild(option);
            });
            
            subcategoryGroup.appendChild(optionsContainer);
            subcategoriesContainer.appendChild(subcategoryGroup);
        } else {
            const noFiltersMessage = document.createElement('p');
            noFiltersMessage.textContent = 'No hay filtros disponibles para esta categoría.';
            noFiltersMessage.style.textAlign = 'center';
            noFiltersMessage.style.color = 'var(--text-light)';
            noFiltersMessage.style.padding = '20px';
            subcategoriesContainer.appendChild(noFiltersMessage);
        }
    }

    function getCategoryName(categoryId) {
        if (!categoriasData || !categoriasData.categorias) return categoryId;
        
        const categoria = categoriasData.categorias.find(cat => cat.id === categoryId);
        return categoria ? categoria.nombre : categoryId;
    }

    function closeFiltersModal() {
        const filtersModal = document.getElementById('filtersModal');
        if (filtersModal) {
            filtersModal.style.display = 'none';
        }
    }

    function applyFiltersHandler() {
        // Guardar filtros en localStorage
        localStorage.setItem('lastFilters', JSON.stringify(selectedFilters));
        
        const activeCategory = document.querySelector('.category-filter.active');
        if (activeCategory) {
            // Recargar productos con los filtros aplicados
            loadProducts(currentCategoryKey);
        }
        
        closeFiltersModal();
        
    }

    function clearFiltersHandler() {
        const subcategoriesContainer = document.getElementById('subcategoriesContainer');
        if (!subcategoriesContainer) return;
        
        const checkboxes = subcategoriesContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        selectedFilters = [];
        localStorage.setItem('lastFilters', JSON.stringify(selectedFilters));
        showToast('Filtros limpiados');
        
        // Recargar productos sin filtros
        const activeCategory = document.querySelector('.category-filter.active');
        if (activeCategory) {
            loadProducts(currentCategoryKey);
        }
    }

    function closeModalsOutside(event) {
        const cartModal = document.getElementById('cartModal');
        const filtersModal = document.getElementById('filtersModal');
        
        if (cartModal && event.target === cartModal) {
            closeCartModal();
        }
        if (filtersModal && event.target === filtersModal) {
            closeFiltersModal();
        }
    }

    function showToast(message) {
        // Crear toast si no existe
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Prevenir que el menú se cierre al hacer clic dentro
    const dropdownContent = document.getElementById('dropdownContent');
    if (dropdownContent) {
        dropdownContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Recargar categorías periódicamente cada 30 segundos
    setInterval(() => {
        fetch('/api/categorias')
            .then(response => response.json())
            .then(data => {
                // Solo actualizar si los datos son diferentes
                if (JSON.stringify(categoriasData) !== JSON.stringify(data)) {
                    categoriasData = data;
                    renderCategoryFilters(data.categorias);
                    console.log('Categorías actualizadas desde el servidor');
                }
            })
            .catch(error => {
                console.error('Error recargando categorías:', error);
            });
    }, 30000); // 30 segundos

    // También recargar cuando la ventana gana el foco
    window.addEventListener('focus', () => {
        fetch('/api/categorias')
            .then(response => response.json())
            .then(data => {
                categoriasData = data;
                renderCategoryFilters(data.categorias);
            })
            .catch(error => {
                console.error('Error recargando categorías:', error);
            });
    });
});