
 (function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            
            document.getElementById(tabId).classList.add('active');
            
            // Buscar item del menu correspondiente
            const items = document.querySelectorAll('.nav-item');
            if(tabId === 'registro') { items[0].classList.add('active'); document.getElementById('page-title').innerText = "Registro de Atletas y Ejemplares"; }
            if(tabId === 'sorteo1') { items[1].classList.add('active'); document.getElementById('page-title').innerText = "Generador Estocástico - Sorteo 1"; }
            if(tabId === 'computos') { items[2].classList.add('active'); document.getElementById('page-title').innerText = "Mesa Técnica - Cómputos Métricos"; }
            if(tabId === 'sorteodinamico') { items[3].classList.add('active'); document.getElementById('page-title').innerText = "Algoritmo de Sorteo Dinámico"; }
        

        function addColeador() {
            const name = document.getElementById('col-nombre').value;
            const cedula = document.getElementById('col-cedula').value;
            const cat = document.getElementById('col-categoria').value;
            const equino = document.getElementById('col-equino').value;
            const prop = document.getElementById('col-propietario').value;

            const tbody = document.getElementById('tabla-nomina');
            const newRow = document.createElement('tr');
            newRow.innerHTML = `<td>${cedula}</td><td>${name}</td><td>${cat}</td><td>${equino}</td><td>${prop}</td>`;
            tbody.appendChild(newRow);

            alert('Coleador registrado con éxito en la base de datos temporal (Prototipo).');
            document.getElementById('col-nombre').value = '';
            document.getElementById('col-cedula').value = '';
            document.getElementById('col-equino').value = '';
            document.getElementById('col-propietario').value = '';
        }

        function generarSorteoInicial() {
            document.getElementById('resultados-sorteo-1').style.display = 'block';
            alert('Algoritmo ejecutado. Los datos han sido barajados sin colisiones.');
        }

        function generarSorteoDinamico() {
            document.getElementById('resultados-sorteo-dinamico').style.display = 'block';
            alert('Sorteo Dinámico Estructurado. Orden de ejecución procesado por orden de mérito.');
        }

        function calcularFila(id) {
            alert('Cómputos recalculados y almacenados para la entidad ID: ' + id);
        }
   
});