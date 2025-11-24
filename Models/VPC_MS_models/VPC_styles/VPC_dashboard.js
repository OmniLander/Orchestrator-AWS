document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const refreshBtn = document.getElementById('refreshBtn');
    const vpcList = document.getElementById('vpcList');
    const subnetList = document.getElementById('subnetList');
    const createVpcForm = document.getElementById('createVpcForm');
    const createSubnetForm = document.getElementById('createSubnetForm');
    const vpcForSubnetSelect = document.getElementById('vpcForSubnet');
    const alertContainer = document.getElementById('alertContainer');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const createSubnetModal = document.getElementById('createSubnetModal');
    const modalSubnetForm = document.getElementById('modalSubnetForm');
    const cancelSubnetBtn = document.getElementById('cancelSubnetBtn');
    const confirmSubnetBtn = document.getElementById('confirmSubnetBtn');
    const modalVpcId = document.getElementById('modalVpcId');
    
    let currentVpcIdForSubnet = '';
    
    // Cargar datos iniciales
    loadVpcs();
    loadSubnets();
    populateVpcSelect();
    
    // Event Listeners
    refreshBtn.addEventListener('click', function() {
        loadVpcs();
        loadSubnets();
        populateVpcSelect();
        showAlert('Datos actualizados correctamente', 'success');
    });
    
    createVpcForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createVpc();
    });
    
    createSubnetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createSubnetFromForm();
    });
    
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remover clase active de todas las pestañas y contenidos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Agregar clase active a la pestaña y contenido seleccionados
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Modal para crear subnet
    cancelSubnetBtn.addEventListener('click', function() {
        createSubnetModal.style.display = 'none';
    });
    
    confirmSubnetBtn.addEventListener('click', function() {
        createSubnetFromModal();
    });
    
    // Funciones para cargar datos
    function loadVpcs() {
        vpcList.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando VPCs...</div>';
        
        fetch('/VPC_in_existance')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayVpcs(data.data);
                } else {
                    vpcList.innerHTML = '<div class="empty-state">Error al cargar las VPCs</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                vpcList.innerHTML = '<div class="empty-state">Error al cargar las VPCs</div>';
            });
    }
    
    function loadSubnets() {
        subnetList.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando subnets...</div>';
        
        fetch('/Subnets_in_existance')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displaySubnets(data.data);
                } else {
                    subnetList.innerHTML = '<div class="empty-state">Error al cargar las subnets</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                subnetList.innerHTML = '<div class="empty-state">Error al cargar las subnets</div>';
            });
    }
    
    function populateVpcSelect() {
        fetch('/VPC_in_existance')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data) {
                    vpcForSubnetSelect.innerHTML = '<option value="">Selecciona una VPC</option>';
                    
                    for (const [vpcId, vpcData] of Object.entries(data.data)) {
                        const option = document.createElement('option');
                        option.value = vpcId;
                        option.textContent = `${vpcData.name} (${vpcId})`;
                        vpcForSubnetSelect.appendChild(option);
                    }
                } else {
                    vpcForSubnetSelect.innerHTML = '<option value="">No hay VPCs disponibles</option>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                vpcForSubnetSelect.innerHTML = '<option value="">Error al cargar VPCs</option>';
            });
    }
    
    // Funciones para mostrar datos
    function displayVpcs(vpcs) {
        if (!vpcs || Object.keys(vpcs).length === 0) {
            vpcList.innerHTML = '<div class="empty-state">No hay VPCs existentes</div>';
            return;
        }
        
        let html = '';
        
        for (const [vpcId, vpcData] of Object.entries(vpcs)) {
            const stateClass = vpcData.state === 'available' ? 'state-available' : 'state-pending';
            
            html += `
                <div class="vpc-item">
                    <div class="vpc-name">${vpcData.name}</div>
                    <div class="vpc-id">${vpcId}</div>
                    <div class="vpc-details">
                        <span>CIDR: ${vpcData.cidr_block}</span>
                        <span class="vpc-state ${stateClass}">${vpcData.state}</span>
                    </div>
                    <div class="action-buttons">
                        <button class="create-subnet-btn" data-vpc-id="${vpcId}">Crear Subnet</button>
                        <button class="delete-btn" data-vpc-id="${vpcId}">Eliminar VPC</button>
                    </div>
                </div>
            `;
        }
        
        vpcList.innerHTML = html;
        
        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const vpcId = this.getAttribute('data-vpc-id');
                deleteVpc(vpcId);
            });
        });
        
        // Agregar event listeners a los botones de crear subnet
        document.querySelectorAll('.create-subnet-btn').forEach(button => {
            button.addEventListener('click', function() {
                const vpcId = this.getAttribute('data-vpc-id');
                openCreateSubnetModal(vpcId);
            });
        });
    }
    
    function displaySubnets(subnets) {
        if (!subnets || Object.keys(subnets).length === 0) {
            subnetList.innerHTML = '<div class="empty-state">No hay subnets existentes</div>';
            return;
        }
        
        let html = '';
        
        for (const [vpcId, subnetData] of Object.entries(subnets)) {
            html += `<div class="vpc-name" style="margin-top: 15px; margin-bottom: 10px;">VPC: ${vpcId}</div>`;
            
            subnetData.forEach(subnet => {
                const stateClass = subnet.state === 'available' ? 'state-available' : 'state-pending';
                
                html += `
                    <div class="subnet-item">
                        <div class="subnet-name">${subnet.name}</div>
                        <div class="subnet-id">${subnet.subnet_id}</div>
                        <div class="subnet-details">
                            <span>CIDR: ${subnet.block}</span>
                            <span class="subnet-state ${stateClass}">${subnet.state}</span>
                        </div>
                        <div class="subnet-details">
                            <span>Zona: ${subnet.zone}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        subnetList.innerHTML = html;
    }
    
    // Funciones para crear y eliminar VPCs
    function createVpc() {
        const vpcName = document.getElementById('vpcName').value;
        const cidrBlock = document.getElementById('cidrBlock').value;
        
        fetch('/Create_VPC', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vpc_name: vpcName,
                block: cidrBlock
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('VPC creada exitosamente', 'success');
                createVpcForm.reset();
                loadVpcs();
                loadSubnets();
                populateVpcSelect();
            } else {
                showAlert('Error al crear la VPC: ' + data.Error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al crear la VPC', 'error');
        });
    }
    
    function deleteVpc(vpcId) {
        if (!confirm(`¿Estás seguro de que deseas eliminar la VPC ${vpcId}?`)) {
            return;
        }
        
        fetch('/Delete_VPC', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vpc_id: vpcId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('VPC eliminada exitosamente', 'success');
                loadVpcs();
                loadSubnets();
                populateVpcSelect();
            } else {
                showAlert('Error al eliminar la VPC: ' + data.Error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al eliminar la VPC', 'error');
        });
    }
    
    // Funciones para crear subnets
    function openCreateSubnetModal(vpcId) {
        currentVpcIdForSubnet = vpcId;
        modalVpcId.value = vpcId;
        modalSubnetForm.reset();
        createSubnetModal.style.display = 'flex';
    }
    
    function createSubnetFromModal() {
        const subnetName = document.getElementById('modalSubnetName').value;
        const subnetCidr = document.getElementById('modalSubnetCidr').value;
        
        if (!subnetName || !subnetCidr) {
            showAlert('Por favor, completa todos los campos', 'error');
            return;
        }
        
        createSubnet(currentVpcIdForSubnet, subnetCidr, subnetName);
    }
    
    function createSubnetFromForm() {
        const vpcId = document.getElementById('vpcForSubnet').value;
        const subnetName = document.getElementById('subnetName').value;
        const subnetCidr = document.getElementById('subnetCidr').value;
        
        if (!vpcId || !subnetName || !subnetCidr) {
            showAlert('Por favor, completa todos los campos', 'error');
            return;
        }
        
        createSubnet(vpcId, subnetCidr, subnetName);
    }
    
    function createSubnet(vpcId, cidrBlock, subnetName) {
        fetch('/Create_subnet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                vpc_id: vpcId,
                cidr_block: cidrBlock,
                subnet_name: subnetName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Subnet creada exitosamente', 'success');
                createSubnetModal.style.display = 'none';
                createSubnetForm.reset();
                loadSubnets();
            } else {
                showAlert('Error al crear la subnet: ' + data.Error, 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('Error al crear la subnet', 'error');
        });
    }
    
    // Función para mostrar alertas
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'success' ? 'success' : 'error'}`;
        alertDiv.textContent = message;
        
        alertContainer.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});