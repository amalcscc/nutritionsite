// Global variables
let currentUser = null;
const API_URL = 'http://localhost:3000/api';

// DOM Elements
const loginModal = document.getElementById('login-modal');
const showLoginBtn = document.getElementById('show-login');
const closeModalBtn = document.querySelector('.close-modal');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const adminSection = document.getElementById('admin-section');
const dietitianSection = document.getElementById('dietitian-section');
const patientFormSection = document.getElementById('patient-form-section');
const patientForm = document.getElementById('patient-form');
const userNameSpan = document.getElementById('user-name');

// Event Listeners
showLoginBtn.addEventListener('click', showLoginModal);
closeModalBtn.addEventListener('click', closeLoginModal);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
patientForm.addEventListener('submit', handlePatientSubmit);

// Modal Functions
function showLoginModal() {
    loginModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function closeLoginModal() {
    loginModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling
    loginForm.reset();
}

// Click outside modal to close
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        closeLoginModal();
    }
});

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            closeLoginModal();
            showDashboard();
        } else {
            alert('Erreur de connexion: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur de connexion au serveur');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    currentUser = null;
    dashboard.style.display = 'none';
    document.querySelector('.landing-page').style.display = 'block';
    loginForm.reset();
}

// UI Functions
function showDashboard() {
    document.querySelector('.landing-page').style.display = 'none';
    dashboard.style.display = 'block';
    userNameSpan.textContent = currentUser.username;

    if (currentUser.role === 'admin') {
        adminSection.style.display = 'block';
        dietitianSection.style.display = 'none';
    } else if (currentUser.role === 'dietitian') {
        adminSection.style.display = 'none';
        dietitianSection.style.display = 'block';
        loadDietitianDashboard();
    }
}

// User Management Functions
function showUserManagement() {
    const userManagementHtml = `
        <div id="user-management-section">
            <h3>Gestion des Utilisateurs</h3>
            <div class="search-box">
                <input type="text" id="user-search" placeholder="Rechercher des utilisateurs..." />
                <button id="search-user-btn"><i class="fas fa-search"></i> Rechercher</button>
            </div>
            <form id="add-user-form">
                <input type="text" name="username" placeholder="Nom d'utilisateur" required>
                <input type="password" name="password" placeholder="Mot de passe" required>
                <select name="role" required>
                    <option value="">Sélectionner un rôle</option>
                    <option value="dietitian">Diététicien</option>
                    <option value="admin">Administrateur</option>
                </select>
                <button type="submit">Ajouter Utilisateur</button>
            </form>
            <div id="users-list"></div>
        </div>
    `;
    
    dietitianSection.style.display = 'none';
    patientFormSection.style.display = 'none';
    adminSection.innerHTML = `
        <h2>Administration</h2>
        <div class="admin-controls">
            <button onclick="showUserManagement()">Gestion des Utilisateurs</button>
            <button onclick="showPatientManagement()">Gestion des Patients</button>
        </div>
        ${userManagementHtml}
    `;
    adminSection.style.display = 'block';
    
    // Add event listener for the new user form
    document.getElementById('add-user-form').addEventListener('submit', handleAddUser);
    
    // Add event listener for search
    document.getElementById('search-user-btn').addEventListener('click', searchUsers);
    document.getElementById('user-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
    
    loadUsers();
}

async function handleAddUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (data.success) {
            alert('Utilisateur créé avec succès');
            e.target.reset();
            loadUsers();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la création de l\'utilisateur');
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<h4>Liste des Utilisateurs</h4>';
    
    if (users.length === 0) {
        usersList.innerHTML += '<p>Aucun utilisateur trouvé</p>';
        return;
    }
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        userElement.innerHTML = `
            <p>Nom: ${user.username}</p>
            <p>Rôle: ${user.role}</p>
        `;
        usersList.appendChild(userElement);
    });
}

async function searchUsers() {
    const searchQuery = document.getElementById('user-search').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayUsers(data.users);
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la recherche des utilisateurs');
    }
}

// Patient Management Functions
function showPatientManagement() {
    const patientManagementHtml = `
        <div id="patient-management-section">
            <h3>Gestion des Patients</h3>
            <div class="search-box">
                <input type="text" id="patient-search" placeholder="Rechercher des patients..." />
                <button id="search-patient-btn"><i class="fas fa-search"></i> Rechercher</button>
            </div>
            <form id="patient-form">
                <input type="text" name="name" placeholder="Nom complet" required>
                <input type="number" name="age" placeholder="Âge" required>
                <select name="sex" required>
                    <option value="">Sélectionner le sexe</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                </select>
                <input type="tel" name="phone" placeholder="Téléphone" required>
                <input type="number" name="weight" placeholder="Poids (kg)" step="0.1" required>
                <input type="number" name="height" placeholder="Taille (cm)" required>
                <button type="submit">Ajouter Patient</button>
            </form>
            <div id="patients-list" class="patients-grid"></div>
        </div>
    `;
    
    dietitianSection.style.display = 'none';
    adminSection.innerHTML = `
        <h2>Administration</h2>
        <div class="admin-controls">
            <button onclick="showUserManagement()">Gestion des Utilisateurs</button>
            <button onclick="showPatientManagement()">Gestion des Patients</button>
        </div>
        ${patientManagementHtml}
    `;
    adminSection.style.display = 'block';
    
    // Add event listener for the patient form
    document.getElementById('patient-form').addEventListener('submit', handlePatientSubmit);
    
    // Add event listener for search
    document.getElementById('search-patient-btn').addEventListener('click', searchPatients);
    document.getElementById('patient-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPatients();
        }
    });
    
    loadAllPatients();
}

async function handlePatientSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());
    
    // Assurer que le patient est créé comme non archivé
    patientData.archived = 0;

    try {
        const response = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(patientData),
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient enregistré avec succès');
            e.target.reset();
            loadPatients();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'enregistrement du patient');
    }
}

async function loadPatients() {
    try {
        const response = await fetch(`${API_URL}/patients?archived=false`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function searchPatients() {
    const searchQuery = document.getElementById('patient-search').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/patients/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayPatients(data.patients);
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la recherche des patients');
    }
}

function displayPatients(patients) {
    const patientsList = document.getElementById('patients-list');
    if (!patientsList) return;
    
    patientsList.innerHTML = `
        <div class="patients-header">
            <h4>Liste des Patients</h4>
            <div class="filter-options">
                <button id="show-all-patients" class="active">Voir Tous</button>
            </div>
        </div>
    `;

    // Ajouter les événements pour les filtres
    document.getElementById('show-all-patients').addEventListener('click', function() {
        loadAllPatients();
    });

    if (patients.length === 0) {
        patientsList.innerHTML += '<p class="no-data">Aucun patient enregistré</p>';
        return;
    }

    const patientsGrid = document.createElement('div');
    patientsGrid.className = 'patients-grid';
    patientsList.appendChild(patientsGrid);

    patients.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.className = 'patient-card';
        const imc = (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1);
        
        // Ajouter un indicateur d'état (actif/archivé)
        const statusClass = patient.archived ? 'status-archived' : 'status-active';
        const statusText = patient.archived ? 'Archivé' : 'Actif';
        
        patientCard.innerHTML = `
            <div class="patient-status ${statusClass}">${statusText}</div>
            <h4>${patient.name}</h4>
            <p>Age: ${patient.age} ans</p>
            <p>Sexe: ${patient.sex === 'M' ? 'Masculin' : 'Féminin'}</p>
            <p>Téléphone: ${patient.phone}</p>
            <p>Poids: ${patient.weight} kg</p>
            <p>Taille: ${patient.height} cm</p>
            <p>IMC: ${imc}</p>
            <div class="patient-actions">
                <button onclick="viewPatientHistory(${patient.id})" class="view-btn">Historique</button>
                ${patient.archived ? 
                    `<button onclick="restorePatient(${patient.id})" class="restore-btn">Restaurer</button>` :
                    `<button onclick="archivePatient(${patient.id})" class="archive-btn">Archiver</button>`
                }
            </div>
        `;
        patientsGrid.appendChild(patientCard);
    });
}

async function deletePatient(patientId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/patients/${patientId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient supprimé avec succès');
            loadPatients();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la suppression du patient');
    }
}

// Appointment Functions
async function loadAppointments() {
    try {
        const response = await fetch(`${API_URL}/appointments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayAppointments(data.appointments);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayAppointments(appointments) {
    const calendar = document.getElementById('appointments-calendar');
    calendar.innerHTML = '';

    if (appointments.length === 0) {
        calendar.innerHTML = '<p class="no-data">Aucun rendez-vous programmé</p>';
        return;
    }
    
    // Pour déboguer - afficher les propriétés d'un rendez-vous dans la console
    if (appointments.length > 0) {
        console.log("Exemple de rendez-vous complet:", JSON.stringify(appointments[0]));
        console.log("Type de patient_id:", typeof appointments[0].patient_id);
        console.log("Valeur de patient_id:", appointments[0].patient_id);
    }

    // Grouper les rendez-vous par date
    const appointmentsByDate = {};
    appointments.forEach(appointment => {
        const date = new Date(appointment.date).toLocaleDateString();
        if (!appointmentsByDate[date]) {
            appointmentsByDate[date] = [];
        }
        appointmentsByDate[date].push(appointment);
    });

    // Afficher les rendez-vous groupés par date
    Object.keys(appointmentsByDate).sort().forEach(date => {
        const dateSection = document.createElement('div');
        dateSection.className = 'date-section';
        dateSection.innerHTML = `<h4>${date}</h4>`;

        const appointmentsList = document.createElement('div');
        appointmentsList.className = 'appointments-list';

        appointmentsByDate[date].forEach(appointment => {
            const time = new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const appointmentCard = document.createElement('div');
            appointmentCard.className = 'appointment-card';
            
            // S'assurer que patient_id est un nombre
            const patientId = parseInt(appointment.patient_id);
            
            appointmentCard.innerHTML = `
                <div class="appointment-time">${time}</div>
                <div class="appointment-details">
                    <h5>${appointment.patientName}</h5>
                    ${appointment.notes ? `<p class="appointment-notes">${appointment.notes}</p>` : ''}
                </div>
                <div class="appointment-actions">
                    <button onclick="editAppointment(${appointment.id})" class="edit-btn">Modifier</button>
                    <button onclick="deleteAppointment(${appointment.id})" class="delete-btn">Annuler</button>
                    <button onclick="archivePatientFromAppointment(${patientId})" class="archive-btn">Archiver Patient</button>
                </div>
            `;
            appointmentsList.appendChild(appointmentCard);
        });

        dateSection.appendChild(appointmentsList);
        calendar.appendChild(dateSection);
    });
}

async function deleteAppointment(appointmentId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            alert('Rendez-vous annulé avec succès');
            loadAppointments();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'annulation du rendez-vous');
    }
}

// Fonctions pour le tableau de bord du diététicien
function loadDietitianDashboard() {
    dietitianSection.innerHTML = `
        <h2>Espace Diététicien</h2>
        <div class="dashboard-grid">
            <div class="calendar-section">
                <div class="section-header">
                    <h3>Calendrier des Rendez-vous</h3>
                    <button onclick="showAddAppointmentForm()">Nouveau Rendez-vous</button>
                </div>
                <div id="appointments-calendar"></div>
            </div>
            <div class="patient-section">
                <div class="section-header">
                    <h3>Dossiers Patients</h3>
                    <div class="patient-actions-header">
                        <div class="search-box">
                            <input type="text" id="dietitian-patient-search" placeholder="Rechercher des patients..." />
                            <button id="search-dietitian-patient-btn"><i class="fas fa-search"></i></button>
                        </div>
                        <button onclick="showAddPatientForm()">Nouveau Patient</button>
                    </div>
                </div>
                <div id="dietitian-patient-list"></div>
            </div>
        </div>

        <!-- Formulaire de Rendez-vous -->
        <div id="appointment-form-modal" class="modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closeAppointmentModal()">&times;</span>
                <h3>Nouveau Rendez-vous</h3>
                <form id="appointment-form">
                    <select name="patient_id" required>
                        <option value="">Sélectionner un patient</option>
                    </select>
                    <input type="datetime-local" name="date" required>
                    <textarea name="notes" placeholder="Notes" rows="4"></textarea>
                    <button type="submit">Enregistrer</button>
                </form>
            </div>
        </div>

        <!-- Formulaire Patient -->
        <div id="patient-form-modal" class="modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closePatientModal()">&times;</span>
                <h3>Nouveau Patient</h3>
                <form id="new-patient-form">
                    <input type="text" name="name" placeholder="Nom complet" required>
                    <input type="number" name="age" placeholder="Âge" required>
                    <select name="sex" required>
                        <option value="">Sélectionner le sexe</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                    </select>
                    <input type="tel" name="phone" placeholder="Téléphone" required>
                    <input type="number" name="weight" step="0.1" placeholder="Poids (kg)" required>
                    <input type="number" name="height" placeholder="Taille (cm)" required>
                    <button type="submit">Enregistrer</button>
                </form>
            </div>
        </div>
    `;

    // Initialiser les gestionnaires d'événements
    document.getElementById('appointment-form').addEventListener('submit', handleAppointmentSubmit);
    document.getElementById('new-patient-form').addEventListener('submit', handleNewPatientSubmit);
    
    // Ajouter un événement pour la recherche de patients
    document.getElementById('search-dietitian-patient-btn').addEventListener('click', searchDietitianPatients);
    document.getElementById('dietitian-patient-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchDietitianPatients();
        }
    });
    
    loadAppointments();
    loadAllDietitianPatients();
}

// Gestion des rendez-vous
function showAddAppointmentForm() {
    const modal = document.getElementById('appointment-form-modal');
    modal.style.display = 'block';
    loadPatientsList();
}

function closeAppointmentModal() {
    const modal = document.getElementById('appointment-form-modal');
    modal.style.display = 'none';
}

async function loadPatientsList() {
    try {
        const response = await fetch(`${API_URL}/patients?archived=false`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            const select = document.querySelector('#appointment-form select[name="patient_id"]');
            select.innerHTML = '<option value="">Sélectionner un patient</option>';
            
            data.patients.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.id;
                option.textContent = patient.name;
                select.appendChild(option);
            });
            
            return true; // Retourne une promesse résolue
        }
        return false;
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors du chargement des patients');
        return false;
    }
}

async function handleAppointmentSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const appointmentData = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(appointmentData),
        });

        const data = await response.json();

        if (data.success) {
            alert('Rendez-vous enregistré avec succès');
            closeAppointmentModal();
            e.target.reset();
            loadAppointments();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'enregistrement du rendez-vous');
    }
}

// Gestion des patients pour le diététicien
async function loadDietitianPatients() {
    try {
        const response = await fetch(`${API_URL}/patients?archived=false`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayDietitianPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayDietitianPatients(patients) {
    const patientList = document.getElementById('dietitian-patient-list');
    
    patientList.innerHTML = `
        <div class="patients-header">
            <h4>Liste des Patients</h4>
            <div class="filter-options">
                <button id="dietitian-show-all" class="active">Voir Tous</button>
            </div>
        </div>
    `;
    
    // Ajouter les écouteurs d'événements pour les filtres
    document.getElementById('dietitian-show-all').addEventListener('click', function() {
        loadAllDietitianPatients();
    });

    if (patients.length === 0) {
        patientList.innerHTML += '<p class="no-data">Aucun patient enregistré</p>';
        return;
    }

    const patientsGrid = document.createElement('div');
    patientsGrid.className = 'dietitian-patients-grid';
    patientList.appendChild(patientsGrid);

    patients.forEach(patient => {
        const patientCard = document.createElement('div');
        patientCard.className = 'patient-card';
        const imc = (patient.weight / Math.pow(patient.height / 100, 2)).toFixed(1);
        
        // Ajouter un indicateur d'état (actif/archivé)
        const statusClass = patient.archived ? 'status-archived' : 'status-active';
        const statusText = patient.archived ? 'Archivé' : 'Actif';
        
        patientCard.innerHTML = `
            <div class="patient-info">
                <div class="patient-status ${statusClass}">${statusText}</div>
                <h4>${patient.name}</h4>
                <p>Age: ${patient.age} ans</p>
                <p>Sexe: ${patient.sex === 'M' ? 'Masculin' : 'Féminin'}</p>
                <p>Téléphone: ${patient.phone}</p>
                <p>Poids: ${patient.weight} kg</p>
                <p>Taille: ${patient.height} cm</p>
                <p>IMC: ${imc}</p>
            </div>
            <div class="patient-actions">
                <button onclick="viewPatientHistory(${patient.id})" class="view-btn">Historique</button>
                <button onclick="scheduleAppointment(${patient.id})">Programmer RDV</button>
                ${patient.archived ? 
                    `<button onclick="restorePatient(${patient.id})" class="restore-btn">Restaurer</button>` :
                    `<button onclick="archivePatient(${patient.id})" class="archive-btn">Archiver</button>`
                }
            </div>
        `;
        patientsGrid.appendChild(patientCard);
    });
}

// Gestion des patients
function showAddPatientForm() {
    const modal = document.getElementById('patient-form-modal');
    modal.style.display = 'block';
}

function closePatientModal() {
    const modal = document.getElementById('patient-form-modal');
    modal.style.display = 'none';
}

async function handleNewPatientSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());
    
    // Assurer que le patient est créé comme non archivé
    patientData.archived = 0;

    try {
        const response = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(patientData),
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient enregistré avec succès');
            closePatientModal();
            e.target.reset();
            loadAllDietitianPatients();
            loadPatientsList(); // Recharger la liste des patients pour le formulaire de rendez-vous
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'enregistrement du patient');
    }
}

async function searchDietitianPatients() {
    const searchQuery = document.getElementById('dietitian-patient-search').value.trim();
    
    try {
        const response = await fetch(`${API_URL}/patients/search?q=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayDietitianPatients(data.patients);
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la recherche des patients');
    }
}

async function archivePatient(patientId) {
    // Vérifier que patientId est défini et valide
    if (!patientId) {
        console.error("Erreur: ID de patient non défini");
        alert("Erreur: Impossible d'archiver ce patient, ID non disponible");
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir archiver ce patient ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/patients/${patientId}/archive`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient archivé avec succès');
            
            // Rafraîchir la vue appropriée
            if (currentUser.role === 'admin') {
                loadAllPatients();
            } else if (currentUser.role === 'dietitian') {
                loadAllDietitianPatients();
                loadAppointments();
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'archivage du patient');
    }
}

async function restorePatient(patientId) {
    if (!confirm('Êtes-vous sûr de vouloir restaurer ce patient ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/patients/${patientId}/restore`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient restauré avec succès');
            
            // Rafraîchir la vue appropriée
            if (currentUser.role === 'admin') {
                loadAllPatients();
            } else if (currentUser.role === 'dietitian') {
                loadAllDietitianPatients();
            }
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la restauration du patient');
    }
}

async function loadArchivedPatients() {
    try {
        const response = await fetch(`${API_URL}/patients?archived=true`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadAllDietitianPatients() {
    try {
        const response = await fetch(`${API_URL}/patients/all`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayDietitianPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadDietitianArchivedPatients() {
    try {
        const response = await fetch(`${API_URL}/patients?archived=true`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadAllPatients() {
    try {
        const response = await fetch(`${API_URL}/patients/all`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            displayPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Fonction spécifique pour archiver un patient à partir d'un rendez-vous
async function archivePatientFromAppointment(patientId) {
    // Vérifier que patientId est défini et valide
    if (!patientId) {
        console.error("Erreur: ID de patient non défini dans le rendez-vous");
        alert("Erreur: Impossible d'archiver ce patient, ID non disponible");
        return;
    }
    
    // Convertir en nombre entier pour s'assurer de la compatibilité
    patientId = parseInt(patientId);
    
    if (isNaN(patientId)) {
        console.error("Erreur: ID de patient n'est pas un nombre valide");
        alert("Erreur: ID de patient invalide");
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir archiver ce patient ?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/patients/${patientId}/archive`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
        });

        const data = await response.json();

        if (data.success) {
            alert('Patient archivé avec succès');
            // Rafraîchir la liste des rendez-vous
            loadAppointments();
            // Si nous sommes dans l'interface du diététicien, rafraîchir aussi la liste des patients
            if (currentUser.role === 'dietitian') {
                loadAllDietitianPatients();
            }
        } else {
            alert('Erreur du serveur: ' + (data.message || 'Détails non disponibles'));
        }
    } catch (error) {
        console.error('Erreur lors de l\'archivage du patient:', error);
        alert(`Erreur lors de l'archivage du patient: ${error.message || 'Erreur inconnue'}`);
    }
}

// Check for existing session
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${API_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                showDashboard();
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
        });
    }
});