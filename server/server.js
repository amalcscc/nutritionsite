const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
        // Exécuter la migration pour s'assurer que la colonne 'archived' existe
        migrateDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        // Patients table
        db.run(`CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER,
            sex TEXT,
            phone TEXT,
            weight REAL,
            height REAL,
            archived INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Vérifier si la colonne 'archived' existe déjà dans la table patients
        db.get("PRAGMA table_info(patients)", [], (err, rows) => {
            if (err) {
                console.error("Erreur lors de la vérification des colonnes:", err);
                return;
            }
            
            // Vérifier si la colonne 'archived' existe
            db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
                if (err) {
                    console.error("Erreur lors de la vérification de la colonne 'archived':", err);
                    return;
                }
                
                // Si la colonne n'existe pas, l'ajouter
                if (row.count === 0) {
                    console.log("Ajout de la colonne 'archived' à la table patients...");
                    db.run("ALTER TABLE patients ADD COLUMN archived INTEGER DEFAULT 0", (err) => {
                        if (err) {
                            console.error("Erreur lors de l'ajout de la colonne 'archived':", err);
                        } else {
                            console.log("Colonne 'archived' ajoutée avec succès à la table patients");
                        }
                    });
                } else {
                    console.log("La colonne 'archived' existe déjà dans la table patients");
                }
            });
        });

        // Appointments table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            dietitian_id INTEGER,
            date DATETIME NOT NULL,
            notes TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients (id),
            FOREIGN KEY (dietitian_id) REFERENCES users (id)
        )`);

        // Patient History table
        db.run(`CREATE TABLE IF NOT EXISTS patient_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            weight REAL,
            FOREIGN KEY (patient_id) REFERENCES patients (id)
        )`);

        // Create default admin user if it doesn't exist
        const adminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) 
                VALUES ('admin', ?, 'admin')`, [adminPassword]);
    });
}

// Fonction de migration pour s'assurer de la structure correcte de la base de données
function migrateDatabase() {
    console.log("Vérification des migrations de base de données...");
    
    // Migration #1: Ajouter la colonne 'archived' à la table patients si elle n'existe pas déjà
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return;
        }
        
        if (row && row.count === 0) {
            console.log("Migration #1: Ajout de la colonne 'archived' à la table patients...");
            db.run("ALTER TABLE patients ADD COLUMN archived INTEGER DEFAULT 0", (err) => {
                if (err) {
                    console.error("Erreur lors de la migration #1:", err);
                } else {
                    console.log("Migration #1 terminée avec succès");
                }
            });
        } else {
            console.log("Migration #1 déjà appliquée");
        }
    });
}

// JWT secret key
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Routes

// Auth routes
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
        res.json({ 
            success: true, 
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });
    });
});

// User routes
app.post('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error creating user' });
            }
            res.json({ success: true, id: this.lastID });
        });
});

app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    db.all('SELECT id, username, role FROM users', [], (err, users) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching users' });
        }
        res.json({ success: true, users });
    });
});

// Search users endpoint
app.get('/api/users/search', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Accès administrateur requis' });
    }
    
    const searchQuery = req.query.q || '';
    
    // Use LIKE with wildcards to perform a partial match on username
    db.all('SELECT id, username, role FROM users WHERE username LIKE ?', 
        [`%${searchQuery}%`], 
        (err, users) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la recherche des utilisateurs' });
            }
            res.json({ success: true, users });
        });
});

// User statistics endpoint
app.get('/api/users/statistics', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Accès administrateur requis' });
    }
    
    // Query to get all users
    db.all('SELECT id, username, role, datetime(created_at, "localtime") as created_at FROM users', [], 
        (err, users) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
            }
            
            // Calculate user statistics
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const statistics = {
                totalUsers: users.length,
                dietitians: users.filter(u => u.role === 'dietitian').length,
                admins: users.filter(u => u.role === 'admin').length,
                newUsers: users.filter(u => {
                    if (!u.created_at) return false;
                    const createdDate = new Date(u.created_at);
                    return createdDate >= thirtyDaysAgo;
                }).length
            };
            
            res.json({ success: true, statistics });
        });
});

// Endpoint pour obtenir tous les patients (y compris archivés ou non) - Placer avant les routes avec paramètres
app.get('/api/patients/all', authenticateToken, (req, res) => {
    const showArchived = req.query.archived === 'true';
    
    // Vérifier d'abord si la colonne existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la structure de la base de données' });
        }
        
        // Si la colonne n'existe pas, retourner tous les patients sans filtrage
        if (row && row.count === 0) {
            console.log("La colonne 'archived' n'existe pas. Retour de tous les patients.");
            
            db.all('SELECT * FROM patients ORDER BY created_at DESC', [], (err, patients) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des patients' });
                }
                res.json({ success: true, patients });
            });
        } else {
            // La colonne existe, appliquer le filtre
            const query = showArchived 
                ? 'SELECT * FROM patients WHERE archived = 1 ORDER BY created_at DESC'
                : 'SELECT * FROM patients WHERE archived = 0 ORDER BY created_at DESC';
            
            db.all(query, [], (err, patients) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des patients' });
                }
                res.json({ success: true, patients });
            });
        }
    });
});

// Modifier l'endpoint de recherche de patients pour filtrer par archived - Placer avant les routes avec paramètres
app.get('/api/patients/search', authenticateToken, (req, res) => {
    const searchQuery = req.query.q || '';
    const showArchived = req.query.archived === 'true';
    
    // Vérifier d'abord si la colonne existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la structure de la base de données' });
        }
        
        // Si la colonne n'existe pas, rechercher sans filtrage par archive
        if (row && row.count === 0) {
            console.log("La colonne 'archived' n'existe pas. Recherche sans filtrage.");
            
            db.all('SELECT * FROM patients WHERE name LIKE ? ORDER BY created_at DESC', 
                [`%${searchQuery}%`], 
                (err, patients) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur lors de la recherche des patients' });
                    }
                    res.json({ success: true, patients });
                });
        } else {
            // La colonne existe, appliquer le filtre
            const archivedFilter = showArchived ? '1' : '0';
            
            db.all('SELECT * FROM patients WHERE name LIKE ? AND archived = ? ORDER BY created_at DESC', 
                [`%${searchQuery}%`, archivedFilter], 
                (err, patients) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur lors de la recherche des patients' });
                    }
                    res.json({ success: true, patients });
                });
        }
    });
});

app.get('/api/patients', authenticateToken, (req, res) => {
    const showArchived = req.query.archived === 'true';
    
    // Vérifier d'abord si la colonne existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la structure de la base de données' });
        }
        
        // Si la colonne n'existe pas, retourner tous les patients sans filtrage
        if (row && row.count === 0) {
            console.log("La colonne 'archived' n'existe pas. Retour de tous les patients.");
            
            db.all('SELECT * FROM patients ORDER BY created_at DESC', [], (err, patients) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error fetching patients' });
                }
                res.json({ success: true, patients });
            });
        } else {
            // La colonne existe, appliquer le filtre
            const query = showArchived 
                ? 'SELECT * FROM patients WHERE archived = 1 ORDER BY created_at DESC'
                : 'SELECT * FROM patients WHERE archived = 0 ORDER BY created_at DESC';
                
            db.all(query, [], (err, patients) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Error fetching patients' });
                }
                res.json({ success: true, patients });
            });
        }
    });
});

// Patient routes
app.post('/api/patients', authenticateToken, (req, res) => {
    const { name, age, sex, phone, weight, height } = req.body;

    db.run(`INSERT INTO patients (name, age, sex, phone, weight, height) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [name, age, sex, phone, weight, height],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error creating patient' });
            }
            res.json({ success: true, id: this.lastID });
        });
});

// Endpoint pour ajouter une entrée d'historique pour un patient
app.post('/api/patients/:id/history', authenticateToken, (req, res) => {
    const patientId = parseInt(req.params.id);
    
    // Valider que l'ID est un nombre
    if (isNaN(patientId)) {
        return res.status(400).json({ success: false, message: 'ID du patient invalide' });
    }
    
    const { notes, weight } = req.body;

    db.run(`INSERT INTO patient_history (patient_id, notes, weight) 
            VALUES (?, ?, ?)`,
        [patientId, notes, weight],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de l\'ajout à l\'historique' });
            }
            res.json({ success: true, id: this.lastID });
        });
});

// Endpoint pour obtenir l'historique d'un patient
app.get('/api/patients/:id/history', authenticateToken, (req, res) => {
    const patientId = parseInt(req.params.id);
    
    // Valider que l'ID est un nombre
    if (isNaN(patientId)) {
        return res.status(400).json({ success: false, message: 'ID du patient invalide' });
    }

    db.all('SELECT * FROM patient_history WHERE patient_id = ? ORDER BY date DESC', 
        [patientId], 
        (err, history) => {
        if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
        }
            res.json({ success: true, history });
    });
});

app.delete('/api/patients/:id', authenticateToken, (req, res) => {
    const patientId = parseInt(req.params.id);
    
    // Valider que l'ID est un nombre
    if (isNaN(patientId)) {
        return res.status(400).json({ success: false, message: 'ID du patient invalide' });
    }

    db.run('DELETE FROM patients WHERE id = ?', [patientId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error deleting patient' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        res.json({ success: true });
    });
});

// Endpoint pour modifier le champ "archived" d'un patient
app.put('/api/patients/:id/archive', authenticateToken, (req, res) => {
    const patientId = parseInt(req.params.id);
    
    // Valider que l'ID est un nombre
    if (isNaN(patientId)) {
        return res.status(400).json({ success: false, message: 'ID du patient invalide' });
    }
    
    console.log(`Archivage du patient ID: ${patientId}`);

    // Vérifier d'abord si la colonne existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la structure de la base de données' });
        }
        
        // Si la colonne n'existe pas, l'ajouter puis archiver le patient
        if (row && row.count === 0) {
            console.log("La colonne 'archived' n'existe pas. Tentative d'ajout...");
            
            db.run("ALTER TABLE patients ADD COLUMN archived INTEGER DEFAULT 0", (alterErr) => {
                if (alterErr) {
                    console.error("Erreur lors de l'ajout de la colonne 'archived':", alterErr);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la structure de la base de données' });
                }
                
                console.log("Colonne 'archived' ajoutée avec succès. Tentative d'archivage...");
                
                // Maintenant archiver le patient
                archivePatient(patientId, res);
            });
        } else {
            // La colonne existe, archiver directement
            archivePatient(patientId, res);
        }
    });
});

// Fonction auxiliaire pour archiver un patient
function archivePatient(patientId, res) {
    db.run('UPDATE patients SET archived = 1 WHERE id = ?', [patientId], function(err) {
        if (err) {
            console.error('Erreur SQL lors de l\'archivage:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de l\'archivage du patient' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }
        res.json({ success: true });
    });
}

// Endpoint pour restaurer un patient archivé
app.put('/api/patients/:id/restore', authenticateToken, (req, res) => {
    const patientId = parseInt(req.params.id);
    
    // Valider que l'ID est un nombre
    if (isNaN(patientId)) {
        return res.status(400).json({ success: false, message: 'ID du patient invalide' });
    }
    
    console.log(`Restauration du patient ID: ${patientId}`);

    // Vérifier d'abord si la colonne existe
    db.get("SELECT COUNT(*) as count FROM pragma_table_info('patients') WHERE name='archived'", [], (err, row) => {
        if (err) {
            console.error("Erreur lors de la vérification de la colonne 'archived':", err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la vérification de la structure de la base de données' });
        }
        
        // Si la colonne n'existe pas, l'ajouter puis restaurer le patient
        if (row && row.count === 0) {
            console.log("La colonne 'archived' n'existe pas. Tentative d'ajout...");
            
            db.run("ALTER TABLE patients ADD COLUMN archived INTEGER DEFAULT 0", (alterErr) => {
                if (alterErr) {
                    console.error("Erreur lors de l'ajout de la colonne 'archived':", alterErr);
                    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la structure de la base de données' });
                }
                
                console.log("Colonne 'archived' ajoutée avec succès. Tentative de restauration...");
                
                // Maintenant restaurer le patient
                restorePatient(patientId, res);
            });
        } else {
            // La colonne existe, restaurer directement
            restorePatient(patientId, res);
        }
    });
});

// Fonction auxiliaire pour restaurer un patient
function restorePatient(patientId, res) {
    db.run('UPDATE patients SET archived = 0 WHERE id = ?', [patientId], function(err) {
        if (err) {
            console.error('Erreur SQL lors de la restauration:', err);
            return res.status(500).json({ success: false, message: 'Erreur lors de la restauration du patient' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Patient non trouvé' });
        }
        res.json({ success: true });
    });
}

// Appointment routes
app.post('/api/appointments', authenticateToken, (req, res) => {
    const { patient_id, date, notes } = req.body;
    const dietitian_id = req.user.id;

    db.run(`INSERT INTO appointments (patient_id, dietitian_id, date, notes) 
            VALUES (?, ?, ?, ?)`,
        [patient_id, dietitian_id, date, notes],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error creating appointment' });
            }
            res.json({ success: true, id: this.lastID });
        });
});

app.get('/api/appointments', authenticateToken, (req, res) => {
    const query = `
        SELECT a.id, a.patient_id, a.dietitian_id, a.date, a.notes, p.name as patientName 
        FROM appointments a 
        JOIN patients p ON a.patient_id = p.id 
        WHERE a.dietitian_id = ? 
        ORDER BY a.date DESC`;

    db.all(query, [req.user.id], (err, appointments) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching appointments' });
        }
        res.json({ success: true, appointments });
    });
});

app.delete('/api/appointments/:id', authenticateToken, (req, res) => {
    const appointmentId = req.params.id;
    const dietitianId = req.user.id;

    db.run('DELETE FROM appointments WHERE id = ? AND dietitian_id = ?', 
        [appointmentId, dietitianId], 
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la suppression du rendez-vous' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Rendez-vous non trouvé' });
            }
            res.json({ success: true });
        });
});

// Token verification route
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ 
        success: true, 
        user: { id: req.user.id, username: req.user.username, role: req.user.role }
    });
});

// Patient statistics endpoint
app.get('/api/patients/statistics', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'dietitian') {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    
    // Get total patients count
    db.get('SELECT COUNT(*) as total FROM patients', [], (err, totalResult) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
        }
        
        // Get active patients count
        db.get('SELECT COUNT(*) as active FROM patients WHERE archived = 0 OR archived IS NULL', [], (err, activeResult) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
            }
            
            // Get archived patients count
            db.get('SELECT COUNT(*) as archived FROM patients WHERE archived = 1', [], (err, archivedResult) => {
                if (err) {
                    return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
                }
                
                // Get total appointments count
                db.get('SELECT COUNT(*) as appointments FROM appointments', [], (err, appointmentsResult) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques' });
                    }
                    
                    const statistics = {
                        totalPatients: totalResult.total,
                        activePatients: activeResult.active,
                        archivedPatients: archivedResult.archived,
                        totalAppointments: appointmentsResult.appointments
                    };
                    
                    res.json({ success: true, statistics });
                });
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 