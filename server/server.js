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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

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

        // Create default admin user if it doesn't exist
        const adminPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) 
                VALUES ('admin', ?, 'admin')`, [adminPassword]);
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

app.get('/api/patients', authenticateToken, (req, res) => {
    db.all('SELECT * FROM patients ORDER BY created_at DESC', [], (err, patients) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error fetching patients' });
        }
        res.json({ success: true, patients });
    });
});

app.delete('/api/patients/:id', authenticateToken, (req, res) => {
    const patientId = req.params.id;

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
        SELECT a.*, p.name as patientName 
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 