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
const header = document.querySelector('.header');

// Event Listeners
showLoginBtn.addEventListener('click', showLoginModal);
closeModalBtn.addEventListener('click', closeLoginModal);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
patientForm.addEventListener('submit', handlePatientSubmit);
window.addEventListener('scroll', handleHeaderScroll);

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
    } else if (currentUser.role === 'receptionist') {
        adminSection.style.display = 'none';
        dietitianSection.style.display = 'none';
        showReceptionistDashboard();
    }
}

// User Management Functions
function showUserManagement() {
    const userManagementHtml = `
        <div id="user-management-section">
            <div class="dashboard-statistics">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="total-users-count">-</h3>
                        <p class="stat-label">Utilisateurs Total</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-user-md"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="dietitians-count">-</h3>
                        <p class="stat-label">Diététiciens</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-user-shield"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="admins-count">-</h3>
                        <p class="stat-label">Administrateurs</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-user-plus"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="new-users-count">-</h3>
                        <p class="stat-label">Nouveaux (30j)</p>
                    </div>
                </div>
            </div>
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
                    <option value="receptionist">Agent d'Accueil</option>
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
    loadUserStatistics();
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
            <div class="user-actions">
                <button onclick="showEditUserModal('${user.id}')" class="edit-btn">Modifier</button>
                <button onclick="toggleUserSuspension('${user.id}', ${user.suspended ? 'false' : 'true'})" class="suspend-btn">${user.suspended ? 'Réactiver' : 'Suspendre'}</button>
            </div>
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
            <div class="dashboard-statistics">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="total-patients-count">-</h3>
                        <p class="stat-label">Patients Total</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-user-check"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="active-patients-count">-</h3>
                        <p class="stat-label">Patients Actifs</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-archive"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="archived-patients-count">-</h3>
                        <p class="stat-label">Patients Archivés</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                    <div class="stat-content">
                        <h3 class="stat-number" id="appointments-count">-</h3>
                        <p class="stat-label">Rendez-vous</p>
                    </div>
                </div>
            </div>
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
    loadPatientStatistics();
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
    
    // Clear previous content
    patientsList.innerHTML = '';
    
    // Create header element with filter buttons
    const patientsHeader = document.createElement('div');
    patientsHeader.className = 'patients-header';
    patientsHeader.innerHTML = `
        <h4>Liste des Patients</h4>
        <div class="filter-options">
            <button id="show-all-patients" class="active">Voir Tout</button>
            <button id="show-active-patients">Actifs Uniquement</button>
            <button id="show-archived-patients">Archivés Uniquement</button>
        </div>
    `;
    patientsList.appendChild(patientsHeader);

    // Ajouter les événements pour les filtres
    document.getElementById('show-all-patients').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('show-active-patients').classList.remove('active');
        document.getElementById('show-archived-patients').classList.remove('active');
        loadAllPatients();
    });
    
    document.getElementById('show-active-patients').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('show-all-patients').classList.remove('active');
        document.getElementById('show-archived-patients').classList.remove('active');
        loadPatients();
    });
    
    document.getElementById('show-archived-patients').addEventListener('click', function() {
        this.classList.add('active');
        document.getElementById('show-all-patients').classList.remove('active');
        document.getElementById('show-active-patients').classList.remove('active');
        loadArchivedPatients();
    });

    if (patients.length === 0) {
        const noDataMsg = document.createElement('p');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'Aucun patient enregistré';
        patientsList.appendChild(noDataMsg);
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

// Update dietitian dashboard to include receptionist functions
function loadDietitianDashboard() {
    dietitianSection.innerHTML = `
        <h2>Espace Diététicien</h2>
        <div class="admin-controls">
            <button onclick="showDietitianConsultationForm()">Formulaire de Consultation</button>
            <button onclick="showDietitianPatientManagement()">Gestion des Patients</button>
            <button onclick="showDietitianAppointmentManagement()">Gestion des Rendez-vous</button>
            <button onclick="showDietitianAvailability()">Liste de Disponibilité</button>
            <button onclick="viewFoodCatalog()">Catalogue Alimentaire</button>
                </div>
        <div id="dietitian-content"></div>
    `;
    showDietitianConsultationForm();
}

// Update consultation form with correct parameters
function showDietitianConsultationForm() {
    const html = `
        <h3>Formulaire de Consultation</h3>
        <form id="dietitian-consultation-form">
            <h4>Paramètres Anthropométriques (PA)</h4>
            <input type="number" name="weight" placeholder="Poids (kg)" step="0.1" required>
            <input type="number" name="height" placeholder="Taille (cm)" required>
            <input type="number" name="waist" placeholder="Tour de taille (cm)" required>
            
            <h4>Paramètres Biologiques (PB)</h4>
            <input type="number" name="systolic" placeholder="Pression systolique (mmHg)" required>
            <input type="number" name="diastolic" placeholder="Pression diastolique (mmHg)" required>
            
            <button type="submit">Enregistrer Consultation</button>
                </form>
        <div id="bmi-result"></div>
        <div id="weight-history"></div>
        <div id="consultation-history"></div>
        <div id="dietitian-statistics"></div>
    `;
    document.getElementById('dietitian-content').innerHTML = html;
    document.getElementById('dietitian-consultation-form').addEventListener('submit', handleDietitianConsultationSubmit);
    loadWeightHistory();
    loadConsultationHistory();
    loadDietitianStatistics();
}

// Add dietitian patient management functions
function showDietitianPatientManagement() {
    const html = `
        <h3>Gestion des Patients</h3>
        <form id="dietitian-patient-form">
            <input type="text" name="nom" placeholder="Nom" required>
            <input type="text" name="prenom" placeholder="Prénom" required>
            <input type="tel" name="phone" placeholder="Numéro de téléphone" required>
                    <select name="sex" required>
                        <option value="">Sélectionner le sexe</option>
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                    </select>
            <select name="situation_famille" required>
                <option value="">Situation de famille</option>
                <option value="célibataire">Célibataire</option>
                <option value="marié(e)">Marié(e)</option>
                <option value="divorcé(e)">Divorcé(e)</option>
                <option value="veuf(ve)">Veuf(ve)</option>
            </select>
            <input type="text" name="diagnostic" placeholder="Diagnostic médical" required>
                    <button type="submit">Enregistrer</button>
                </form>
        <div id="dietitian-patients-list"></div>
    `;
    document.getElementById('dietitian-content').innerHTML = html;
    document.getElementById('dietitian-patient-form').addEventListener('submit', handleDietitianPatientSubmit);
    loadDietitianPatients();
}

async function handleDietitianPatientSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());
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
    loadDietitianPatients();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'enregistrement du patient');
    }
}

async function loadDietitianPatients() {
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

function displayDietitianPatients(patients) {
    const list = document.getElementById('dietitian-patients-list');
    list.innerHTML = '<h4>Liste des Patients</h4>';
    if (!patients || patients.length === 0) {
        list.innerHTML += '<p>Aucun patient trouvé</p>';
        return;
    }
    patients.forEach(patient => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <p>Nom: ${patient.nom || patient.name} ${patient.prenom || ''}</p>
            <p>Téléphone: ${patient.phone}</p>
            <p>Sexe: ${patient.sex}</p>
            <p>Situation de famille: ${patient.situation_famille || ''}</p>
            <p>Diagnostic médical: ${patient.diagnostic || ''}</p>
            <div class="user-actions">
                <button onclick="editDietitianPatient('${patient.id}')" class="edit-btn">Modifier</button>
                <button onclick="archivePatient('${patient.id}')" class="archive-btn">Archiver</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editDietitianPatient(patientId) {
    // Fetch and fill the form for editing
    fetch(`${API_URL}/patients/${patientId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const patient = data.patient;
            const form = document.getElementById('dietitian-patient-form');
            form.nom.value = patient.nom || patient.name;
            form.prenom.value = patient.prenom || '';
            form.phone.value = patient.phone;
            form.sex.value = patient.sex;
            form.situation_famille.value = patient.situation_famille || '';
            form.diagnostic.value = patient.diagnostic || '';
            form.dataset.editId = patientId;
        }
    });
}

function showDietitianAppointmentManagement() {
    document.getElementById('dietitian-content').innerHTML = '<h3>Gestion des Rendez-vous</h3><div id="dietitian-appointments-list"></div>';
    loadDietitianAppointments();
}

function loadDietitianAppointments() {
    fetch(`${API_URL}/appointments`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayDietitianAppointments(data.appointments);
        }
    });
}

function displayDietitianAppointments(appointments) {
    const list = document.getElementById('dietitian-appointments-list');
    list.innerHTML = '<h4>Liste des Rendez-vous</h4>';
    if (!appointments || appointments.length === 0) {
        list.innerHTML += '<p>Aucun rendez-vous trouvé</p>';
        return;
    }
    appointments.forEach(appointment => {
        const div = document.createElement('div');
        div.className = 'appointment-item';
        div.innerHTML = `
            <p>Date: ${new Date(appointment.date).toLocaleString()}</p>
            <p>Patient: ${appointment.patientName}</p>
            <div class="appointment-actions">
                <button onclick="editDietitianAppointment('${appointment.id}')" class="edit-btn">Modifier</button>
                <button onclick="deleteAppointment('${appointment.id}')" class="delete-btn">Supprimer</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function showDietitianAvailability() {
    document.getElementById('dietitian-content').innerHTML = '<h3>Liste de Disponibilité</h3><div id="dietitian-availability-list"></div>';
    loadDietitianAvailability();
}

function loadDietitianAvailability() {
    fetch(`${API_URL}/availability`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayDietitianAvailability(data.availability);
        }
    });
}

function displayDietitianAvailability(availability) {
    const list = document.getElementById('dietitian-availability-list');
    list.innerHTML = '<h4>Disponibilités</h4>';
    if (!availability || availability.length === 0) {
        list.innerHTML += '<p>Aucune disponibilité trouvée</p>';
        return;
    }
    availability.forEach(slot => {
        const div = document.createElement('div');
        div.className = 'availability-item';
        div.innerHTML = `
            <p>Date: ${new Date(slot.date).toLocaleString()}</p>
            <p>Statut: ${slot.status}</p>
            <div class="availability-actions">
                <button onclick="editDietitianAvailability('${slot.id}')" class="edit-btn">Modifier</button>
                <button onclick="deleteAvailability('${slot.id}')" class="delete-btn">Supprimer</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// Food Catalogue Data
const foodCatalogueData = [
    {
        id: 1,
        name: 'Pomme',
        category: 'fruits',
        image: 'https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2
    },
    {
        id: 2,
        name: 'Banane',
        category: 'fruits',
        image: 'https://images.unsplash.com/photo-1543218024-57a70143c369?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 89,
        protein: 1.1,
        carbs: 23,
        fat: 0.3
    },
    {
        id: 3,
        name: 'Brocoli',
        category: 'vegetables',
        image: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 55,
        protein: 3.7,
        carbs: 11.2,
        fat: 0.6
    },
    {
        id: 4,
        name: 'Poulet (Blanc)',
        category: 'proteins',
        image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6
    },
    {
        id: 5,
        name: 'Riz Brun',
        category: 'grains',
        image: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 216,
        protein: 5,
        carbs: 45,
        fat: 1.8
    },
    {
        id: 6,
        name: 'Yaourt Nature',
        category: 'dairy',
        image: 'https://images.unsplash.com/photo-1571212515416-fca325e3e744?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 59,
        protein: 10,
        carbs: 3.6,
        fat: 0.4
    },
    {
        id: 7,
        name: 'Fraises',
        category: 'fruits',
        image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 32,
        protein: 0.7,
        carbs: 7.7,
        fat: 0.3
    },
    {
        id: 8,
        name: 'Épinards',
        category: 'vegetables',
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 23,
        protein: 2.9,
        carbs: 3.6,
        fat: 0.4
    },
    {
        id: 9,
        name: 'Saumon',
        category: 'proteins',
        image: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 208,
        protein: 20,
        carbs: 0,
        fat: 13
    },
    {
        id: 10,
        name: 'Avoine',
        category: 'grains',
        image: 'https://images.unsplash.com/photo-1595961360979-e9b4a55ea948?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 389,
        protein: 16.9,
        carbs: 66.3,
        fat: 6.9
    },
    {
        id: 11,
        name: 'Fromage',
        category: 'dairy',
        image: 'https://images.unsplash.com/photo-1578156618450-0c899df3187d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 402,
        protein: 25,
        carbs: 2.4,
        fat: 33
    },
    {
        id: 12,
        name: 'Carottes',
        category: 'vegetables',
        image: 'https://images.unsplash.com/photo-1582515073490-39981397c445?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        calories: 41,
        protein: 0.9,
        carbs: 9.6,
        fat: 0.2
    }
];

// Food Catalogue Functions
function initFoodCatalogue() {
    const catalogueGrid = document.getElementById('food-catalogue-grid');
    const searchInput = document.getElementById('food-search');
    const searchBtn = document.getElementById('search-food-btn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    if (!catalogueGrid) return;
    
    // Display all food items initially
    displayFoodItems(foodCatalogueData);
    
    // Add event listeners
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            filterFoodItems(category, searchInput.value);
        });
    });
    
    searchBtn.addEventListener('click', () => {
        const activeCategory = document.querySelector('.category-btn.active').dataset.category;
        filterFoodItems(activeCategory, searchInput.value);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeCategory = document.querySelector('.category-btn.active').dataset.category;
            filterFoodItems(activeCategory, searchInput.value);
        }
    });
    
    function displayFoodItems(items) {
        catalogueGrid.innerHTML = '';
        
        if (items.length === 0) {
            catalogueGrid.innerHTML = '<p class="no-data">Aucun aliment trouvé</p>';
            return;
        }
        
        items.forEach(item => {
            const foodCard = document.createElement('div');
            foodCard.className = 'food-card';
            foodCard.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="food-img">
                <div class="food-info">
                    <h3 class="food-name">${item.name}</h3>
                    <span class="food-category">${getCategoryLabel(item.category)}</span>
                    <div class="nutrition-facts">
                        <div class="nutrition-item">
                            <span class="nutrition-label">Calories</span>
                            <span class="nutrition-value">${item.calories} kcal</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Protéines</span>
                            <span class="nutrition-value">${item.protein}g</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Glucides</span>
                            <span class="nutrition-value">${item.carbs}g</span>
                        </div>
                        <div class="nutrition-item">
                            <span class="nutrition-label">Lipides</span>
                            <span class="nutrition-value">${item.fat}g</span>
                        </div>
                    </div>
                </div>
            `;
            catalogueGrid.appendChild(foodCard);
        });
    }
    
    function filterFoodItems(category, searchText) {
        let filteredItems = [...foodCatalogueData];
        
        // Filter by category
        if (category && category !== 'all') {
            filteredItems = filteredItems.filter(item => item.category === category);
        }
        
        // Filter by search text
        if (searchText && searchText.trim() !== '') {
            const searchLower = searchText.trim().toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchLower) ||
                getCategoryLabel(item.category).toLowerCase().includes(searchLower)
            );
        }
        
        displayFoodItems(filteredItems);
    }
    
    function getCategoryLabel(category) {
        const labels = {
            'fruits': 'Fruits',
            'vegetables': 'Légumes',
            'proteins': 'Protéines',
            'grains': 'Céréales',
            'dairy': 'Produits Laitiers'
        };
        return labels[category] || category;
    }
}

// Check for existing session
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Initialize food catalogue
    initFoodCatalogue();
    
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

// Load User Statistics
async function loadUserStatistics() {
    try {
        const response = await fetch(`${API_URL}/users/statistics`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            // Update the statistics in the UI
            document.getElementById('total-users-count').textContent = data.statistics.totalUsers || 0;
            document.getElementById('dietitians-count').textContent = data.statistics.dietitians || 0;
            document.getElementById('admins-count').textContent = data.statistics.admins || 0;
            document.getElementById('new-users-count').textContent = data.statistics.newUsers || 0;
        } else {
            console.error('Error fetching user statistics:', data.message);
            // Provide fallback data in case of error
            simulateUserStatistics();
        }
    } catch (error) {
        console.error('Error:', error);
        // Provide fallback data in case of network error
        simulateUserStatistics();
    }
}

// Simulate User Statistics (fallback)
function simulateUserStatistics() {
    // Get a list of all users to calculate stats manually
    fetch(`${API_URL}/users`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.users) {
            const users = data.users;
            const totalUsers = users.length;
            const dietitians = users.filter(user => user.role === 'dietitian').length;
            const admins = users.filter(user => user.role === 'admin').length;
            
            // Update the statistics in the UI
            document.getElementById('total-users-count').textContent = totalUsers;
            document.getElementById('dietitians-count').textContent = dietitians;
            document.getElementById('admins-count').textContent = admins;
            document.getElementById('new-users-count').textContent = '-';
        }
    })
    .catch(error => {
        console.error('Error in fallback user statistics:', error);
        // If everything fails, provide some static values
        document.getElementById('total-users-count').textContent = '?';
        document.getElementById('dietitians-count').textContent = '?';
        document.getElementById('admins-count').textContent = '?';
        document.getElementById('new-users-count').textContent = '?';
    });
}

// Load Patient Statistics
async function loadPatientStatistics() {
    try {
        const response = await fetch(`${API_URL}/patients/statistics`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        const data = await response.json();

        if (data.success) {
            // Update the statistics in the UI
            document.getElementById('total-patients-count').textContent = data.statistics.totalPatients || 0;
            document.getElementById('active-patients-count').textContent = data.statistics.activePatients || 0;
            document.getElementById('archived-patients-count').textContent = data.statistics.archivedPatients || 0;
            document.getElementById('appointments-count').textContent = data.statistics.totalAppointments || 0;
        } else {
            console.error('Error fetching patient statistics:', data.message);
            // Provide fallback data in case of error
            simulatePatientStatistics();
        }
    } catch (error) {
        console.error('Error:', error);
        // Provide fallback data in case of network error
        simulatePatientStatistics();
    }
}

// Simulate Patient Statistics (fallback)
function simulatePatientStatistics() {
    // Get all patients first
    fetch(`${API_URL}/patients/all`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.patients) {
            const patients = data.patients;
            const totalPatients = patients.length;
            const activePatients = patients.filter(patient => !patient.archived).length;
            const archivedPatients = patients.filter(patient => patient.archived).length;
            
            // Update the patient statistics
            document.getElementById('total-patients-count').textContent = totalPatients;
            document.getElementById('active-patients-count').textContent = activePatients;
            document.getElementById('archived-patients-count').textContent = archivedPatients;
            
            // Now get appointment count
            return fetch(`${API_URL}/appointments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
        }
        throw new Error('No patient data available');
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.appointments) {
            document.getElementById('appointments-count').textContent = data.appointments.length;
        } else {
            document.getElementById('appointments-count').textContent = '-';
        }
    })
    .catch(error => {
        console.error('Error in fallback patient statistics:', error);
        // If everything fails, provide some static values
        document.getElementById('total-patients-count').textContent = '?';
        document.getElementById('active-patients-count').textContent = '?';
        document.getElementById('archived-patients-count').textContent = '?';
        document.getElementById('appointments-count').textContent = '?';
    });
}

// Header scroll effect
function handleHeaderScroll() {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Add a function to view the food catalog
function viewFoodCatalog() {
    // Hide dashboard sections
    dashboard.style.display = 'none';
    
    // Show landing page which contains the food catalog
    document.querySelector('.landing-page').style.display = 'block';
    
    // Scroll to the food catalog section with a slight delay to ensure the page has rendered
    setTimeout(() => {
        const foodCatalogSection = document.querySelector('.food-catalogue');
        if (foodCatalogSection) {
            foodCatalogSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
    
    // Add a return button at the top
    const header = document.querySelector('.header-content');
    
    // Create return button if it doesn't exist
    if (!document.getElementById('return-to-dashboard')) {
        const returnButton = document.createElement('button');
        returnButton.id = 'return-to-dashboard';
        returnButton.className = 'login-button';
        returnButton.innerHTML = '<i class="fas fa-arrow-left"></i> Retour au Tableau de Bord';
        returnButton.addEventListener('click', returnToDashboard);
        
        // Replace login button with return button
        const loginButton = document.getElementById('show-login');
        if (loginButton && header) {
            header.replaceChild(returnButton, loginButton);
        }
    }
    
    // Reset the food catalog to show all items
    const allCategoryBtn = document.querySelector('.category-btn[data-category="all"]');
    if (allCategoryBtn) {
        // Simulate a click on the "All" category button
        allCategoryBtn.click();
    }
}

// Function to return to the dashboard
function returnToDashboard() {
    // Hide landing page
    document.querySelector('.landing-page').style.display = 'none';
    
    // Show dashboard
    dashboard.style.display = 'block';
    
    // Restore login button
    const header = document.querySelector('.header-content');
    const returnButton = document.getElementById('return-to-dashboard');
    
    if (returnButton && header) {
        const loginButton = document.createElement('button');
        loginButton.id = 'show-login';
        loginButton.className = 'login-button';
        loginButton.innerHTML = '<i class="fas fa-user"></i> Connexion';
        loginButton.addEventListener('click', showLoginModal);
        
        header.replaceChild(loginButton, returnButton);
    }
}

// Add edit user modal logic (if not present)
function showEditUserModal(userId) {
    // Fetch user data
    fetch(`${API_URL}/users/${userId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const user = data.user;
            // Create modal
            let modal = document.getElementById('edit-user-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'edit-user-modal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content login-form-container">
                        <span class="close-modal" onclick="closeEditUserModal()">&times;</span>
                        <div class="login-header">
                            <i class="fas fa-user-edit"></i>
                            <h2>Modifier Utilisateur</h2>
            </div>
                        <form id="edit-user-form">
                            <input type="hidden" name="id" value="${user.id}">
                            <div class="form-group">
                                <label>Nom d'utilisateur</label>
                                <input type="text" name="username" value="${user.username}" required>
                            </div>
                            <div class="form-group">
                                <label>Rôle</label>
                                <select name="role" required>
                                    <option value="dietitian" ${user.role === 'dietitian' ? 'selected' : ''}>Diététicien</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrateur</option>
                                    <option value="receptionist" ${user.role === 'receptionist' ? 'selected' : ''}>Agent d'Accueil</option>
                                </select>
                            </div>
                            <button type="submit" class="submit-btn">Enregistrer</button>
                        </form>
            </div>
        `;
                document.body.appendChild(modal);
            } else {
                modal.querySelector('input[name="id"]').value = user.id;
                modal.querySelector('input[name="username"]').value = user.username;
                modal.querySelector('select[name="role"]').value = user.role;
            }
    modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            document.getElementById('edit-user-form').onsubmit = handleEditUser;
        }
    });
}

function closeEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    if (modal) {
    modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

async function handleEditUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userId = formData.get('id');
    const userData = Object.fromEntries(formData.entries());
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (data.success) {
            alert('Utilisateur modifié avec succès');
            closeEditUserModal();
            loadUsers();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la modification de l\'utilisateur');
    }
}

// Suspend/Reactivate user
async function toggleUserSuspension(userId, suspend) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}/suspend`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ suspended: suspend }),
        });
        const data = await response.json();
        if (data.success) {
            alert(suspend ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
            loadUsers();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de la suspension de l\'utilisateur');
    }
}

// Add receptionist dashboard logic if not present
function showReceptionistDashboard() {
    dashboard.innerHTML = `
        <nav>
            <div class="logo">
                <i class="fas fa-leaf"></i>
                NutriConsult
            </div>
            <div class="user-info">
                <span id="user-name">${currentUser.username}</span>
                <button id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    Déconnexion
                </button>
            </div>
        </nav>
        <div class="dashboard-section">
            <h2>Espace Agent d'Accueil</h2>
            <div class="admin-controls">
                <button onclick="showReceptionistPatientManagement()">Gestion des Patients</button>
                <button onclick="showReceptionistAppointmentManagement()">Gestion des Rendez-vous</button>
                <button onclick="showReceptionistAvailability()">Liste de Disponibilité</button>
            </div>
            <div id="receptionist-content"></div>
        </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    showReceptionistPatientManagement();
}

function showReceptionistPatientManagement() {
    const html = `
        <h3>Ajouter / Modifier Patient</h3>
        <form id="receptionist-patient-form">
            <input type="text" name="nom" placeholder="Nom" required>
            <input type="text" name="prenom" placeholder="Prénom" required>
            <input type="tel" name="phone" placeholder="Numéro de téléphone" required>
            <select name="sex" required>
                <option value="">Sélectionner le sexe</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
            </select>
            <select name="situation_famille" required>
                <option value="">Situation de famille</option>
                <option value="célibataire">Célibataire</option>
                <option value="marié(e)">Marié(e)</option>
                <option value="divorcé(e)">Divorcé(e)</option>
                <option value="veuf(ve)">Veuf(ve)</option>
            </select>
            <input type="text" name="diagnostic" placeholder="Diagnostic médical" required>
            <button type="submit">Enregistrer</button>
        </form>
        <div id="receptionist-patients-list"></div>
    `;
    document.getElementById('receptionist-content').innerHTML = html;
    document.getElementById('receptionist-patient-form').addEventListener('submit', handleReceptionistPatientSubmit);
    loadReceptionistPatients();
}

async function handleReceptionistPatientSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const patientData = Object.fromEntries(formData.entries());
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
            loadReceptionistPatients();
        } else {
            alert('Erreur: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Erreur lors de l\'enregistrement du patient');
    }
}

async function loadReceptionistPatients() {
    try {
        const response = await fetch(`${API_URL}/patients/all`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });
        const data = await response.json();
            if (data.success) {
            displayReceptionistPatients(data.patients);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function displayReceptionistPatients(patients) {
    const list = document.getElementById('receptionist-patients-list');
    list.innerHTML = '<h4>Liste des Patients</h4>';
    if (!patients || patients.length === 0) {
        list.innerHTML += '<p>Aucun patient trouvé</p>';
        return;
    }
    patients.forEach(patient => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
            <p>Nom: ${patient.nom || patient.name} ${patient.prenom || ''}</p>
            <p>Téléphone: ${patient.phone}</p>
            <p>Sexe: ${patient.sex}</p>
            <p>Situation de famille: ${patient.situation_famille || ''}</p>
            <p>Diagnostic médical: ${patient.diagnostic || ''}</p>
            <div class="user-actions">
                <button onclick="editReceptionistPatient('${patient.id}')" class="edit-btn">Modifier</button>
                <button onclick="archivePatient('${patient.id}')" class="archive-btn">Archiver</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editReceptionistPatient(patientId) {
    // Fetch and fill the form for editing (not implemented in detail here)
    alert('Fonction de modification à implémenter');
}

function showReceptionistAppointmentManagement() {
    document.getElementById('receptionist-content').innerHTML = '<h3>Gestion des Rendez-vous</h3><div id="receptionist-appointments-list"></div>';
    // Call a function to load and display appointments, and allow add/edit/delete
    loadReceptionistAppointments();
}

function loadReceptionistAppointments() {
    // Fetch and display appointments, with edit/delete options
    document.getElementById('receptionist-appointments-list').innerHTML = '<p>Liste des rendez-vous (à implémenter)</p>';
}

function showReceptionistAvailability() {
    document.getElementById('receptionist-content').innerHTML = '<h3>Liste de Disponibilité</h3><div id="receptionist-availability-list"></div>';
    // Call a function to load and manage availability slots
    loadReceptionistAvailability();
}

function loadReceptionistAvailability() {
    document.getElementById('receptionist-availability-list').innerHTML = '<p>Gestion de la disponibilité (à implémenter)</p>';
}