const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const {
    Parser
} = require('json2csv');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const SSE = require('sse');
const app = express();
const PORT = 3000;
let helpRequests = []; // Array to store help requests

// MySQL connection setup
const db = mysql.createConnection({
    host: 'db4free.net',
    user: 'daily_news',
    password: 'Anshul@963258',
    database: 'dailynewsdb',
    connectTimeout: 35000 // Increase the timeout value if needed
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
});
// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        app.use(express.static(path.join(__dirname, '..', 'frontend')));
        return next();
    } else {
        res.redirect('/login.html');
    }
}

// Check if user is not logged in yet, then directly redirect to the login page and do not allow access to the paths below
app.use(['/index.html', '/manager-view.html', '/myTodoTask.html', '/deleteUserAccount.html'], isAuthenticated);

// Login Route
app.post('/login', (req, res) => {
    const {
        username,
        password
    } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) throw err;
        console.log('results', results);
        if (results.length > 0) {
            const user = results[0];
            console.log('password', password);
            if (bcrypt.compareSync(password, user.password)) {
                req.session.user = user.id;
                res.send({
                    message: 'Login successful'
                });
            } else {
                res.status(401).send({
                    message: 'Invalid username or password'
                });
            }
        } else {
            res.status(401).send({
                message: 'Invalid username or password'
            });
        }
    });
});

// Register Route
app.post('/register', (req, res) => {
    const {
        username,
        password,
        teamName
    } = req.body;
    console.log('Password', password);
    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log('Password', password, 'hashed password', hashedPassword);

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.status(400).send({
                message: 'User already exists'
            });
        } else {
            const insertUserQuery = 'INSERT INTO users (username, password,teamName) VALUES (?, ?, ?)';
            db.query(insertUserQuery, [username, hashedPassword, teamName], (err) => {
                if (err) throw err;
                res.send({
                    message: 'User registered successfully'
                });
            });
        }
    });
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send({
        message: 'Logout successful'
    });
});

// Endpoint for team members to update their status and add to-do items
app.post('/update-status', isAuthenticated, (req, res) => {
    const {
        status,
        ticketsCount,
        toDoList
    } = req.body;
    const userId = req.session.user;

    if (status) {
        const checkStatusQuery = 'SELECT * FROM team_status WHERE user_id = ?';
        db.query(checkStatusQuery, [userId], (err, results) => {
            if (err) return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });

            if (results.length > 0) {
                const updateStatusQuery = 'UPDATE team_status SET status = ?, tickets_count = ? WHERE user_id = ?';
                db.query(updateStatusQuery, [status, ticketsCount, userId], (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                    res.json({
                        success: true,
                        message: 'Status updated successfully'
                    });
                });
            } else {
                const insertStatusQuery = 'INSERT INTO team_status (user_id, status, tickets_count) VALUES (?, ?, ?)';
                db.query(insertStatusQuery, [userId, status, ticketsCount], (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                    res.json({
                        success: true,
                        message: 'Status updated successfully'
                    });
                });
            }
        });
    }

    if (toDoList) {
        const insertToDoQuery = 'INSERT INTO todos (user_id, task, done) VALUES (?, ?, FALSE)';
        db.query(insertToDoQuery, [userId, toDoList], (err) => {
            if (err) return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
            res.json({
                success: true,
                message: 'To-do added successfully'
            });
        });
    }
});

// Endpoint to get all to-do lists
app.get('/all-todos', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getToDosQuery = 'SELECT * FROM todos WHERE user_id = ?';
    db.query(getToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        res.json({
            [userId]: results
        });
    });
});

// Endpoint to get a user's to-do list
app.get('/get-todo', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getToDosQuery = 'SELECT * FROM todos WHERE user_id = ?';
    db.query(getToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to edit a user's to-do item
app.post('/edit-todo', isAuthenticated, (req, res) => {
    const {
        oldToDo,
        newToDo
    } = req.body;
    const userId = req.session.user;
    const updateToDoQuery = 'UPDATE todos SET task = ? WHERE user_id = ? AND task = ?';
    db.query(updateToDoQuery, [newToDo, userId, oldToDo], (err, results) => {
        if (err) throw err;
        res.send('To-do edited successfully');
    });
});

// Endpoint to delete a user's to-do item
app.delete('/delete-todo', isAuthenticated, (req, res) => {
    const {
        toDo
    } = req.body;
    const userId = req.session.user;
    const deleteToDoQuery = 'DELETE FROM todos WHERE user_id = ? AND task = ?';
    db.query(deleteToDoQuery, [userId, toDo], (err, results) => {
        if (err) throw err;
        res.send('To-do deleted successfully');
    });
});

// Endpoint to mark a to-do item as done
app.post('/mark-done', isAuthenticated, (req, res) => {
    const {
        toDo
    } = req.body;
    const userId = req.session.user;
    const markDoneQuery = 'UPDATE todos SET done = TRUE, completed_at = NOW() WHERE user_id = ? AND task = ?';
    db.query(markDoneQuery, [userId, toDo], (err, results) => {
        if (err) throw err;
        res.send('To-do marked as done');
    });
});


// Endpoint to delete a user's status and to-do list
app.delete('/delete-user/:userId', isAuthenticated, (req, res) => {
    const userId = req.params.userId;
    const {
        pathname
    } = req.query;
    let user_id;

    const getTeamStatusQuery = `
        SELECT users.id, users.username, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    db.query(getTeamStatusQuery, (err, results) => {
        if (err) {
            console.error('Error fetching team status:', err);
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
        results.forEach(function (userData) {
            if (userData.username == userId) {
                user_id = userData.id;
            }
        });


        if (pathname === "/manager-view.html") {
            console.log('user_id', user_id);
            setTimeout(() => {
                const deleteStatusQuery = 'DELETE FROM team_status WHERE user_id = ?';
                db.query(deleteStatusQuery, [user_id], (err) => {
                    if (err) throw err;
                });
            }, 1000);
        }

        if (pathname === "/myTodoTask.html" || pathname === "/deleteUserAccount.html") {
            const deleteToDosQuery = 'DELETE FROM todos WHERE done = 0 and user_id = ?';
            db.query(deleteToDosQuery, [userId], (err) => {
                if (err) throw err;
            });
        }

        if (pathname === "/deleteUserAccount.html") {
            const deleteUserQuery = 'DELETE FROM users WHERE username = ?';
            db.query(deleteUserQuery, [userId], (err) => {
                if (err) throw err;
            });
        }

        res.send(`User ${userId} and their to-do list deleted successfully`);
    });
});

// Endpoint for manager to get team status
app.get('/team-status', isAuthenticated, (req, res) => {
    const getTeamStatusQuery = `
        SELECT users.username,users.teamName, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    db.query(getTeamStatusQuery, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to get the logged-in user's username
app.get('/get-user', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getUserQuery = 'SELECT username,id,teamName FROM users WHERE id = ?';
    const allUserExceptLoggedOne = 'SELECT username FROM users';
    db.query(getUserQuery, [userId], (err, results) => {
        if (err) throw err;

        db.query(allUserExceptLoggedOne, (err, otherUsersResults) => {
            if (err) {
                res.status(500).json({
                    error: 'Database error'
                });
                throw err;
            }

            const otherUsernames = otherUsersResults.map(user => user.username);
            res.json({
                username: results[0].username,
                id: results[0].id,
                teamName: results[0].teamName,
                allOtherUser: otherUsernames
            });
        });

    });
});


// Serve login.html without authentication
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Root route
app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Endpoint to request help
app.post('/request-help', isAuthenticated, (req, res) => {
    const userId = req.body.userId;
    // Add the help request to the array
    helpRequests.push({
        userId,
        timestamp: new Date()
    });
    res.send({
        message: 'Help request sent successfully'
    });
});

// Endpoint to check help requests
app.get('/check-help-requests', isAuthenticated, (req, res) => {
    // Query to get team status data from the database
    const getTeamStatusQuery = `
        SELECT users.id, users.username, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    db.query(getTeamStatusQuery, (err, results) => {
        if (err) {
            console.error('Error fetching team status:', err);
            return res.status(500).json({
                error: 'Internal server error'
            });
        }

        // Filter available users based on status
        const availableUsers = results.filter(member =>
            member.status !== 'Fully Occupied' && member.status !== 'Over loaded for the day, looking for help'
        );

        // Check if the current user is in the list of available users
        const currentUser = availableUsers.find(user => user.id === req.session.user);

        if (currentUser) {
            // Send actual help requests if the current user is available
            res.json({
                helpRequests
            });
        } else {
            // Send an empty array if the current user is not available
            res.json({
                helpRequests: []
            });
        }
    });
});

// Endpoint to accept help request
app.post('/accept-help', isAuthenticated, (req, res) => {
    const {
        helperId,
        requesterId
    } = req.body;
    // Find and remove the help request
    const index = helpRequests.findIndex(request => request.userId === requesterId);
    if (index !== -1) {
        helpRequests.splice(index, 1);
        // Optionally, notify the requester (you may implement this based on your app's notification system)
        res.send({
            message: 'Help request accepted'
        });
    } else {
        res.status(400).send({
            message: 'Help request not found'
        });
    }
});
// Endpoint to get completed tasks
app.get('/completed-todos', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getCompletedToDosQuery = 'SELECT * FROM todos WHERE user_id = ? AND done = TRUE ORDER BY completed_at DESC';
    db.query(getCompletedToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to download completed tasks as CSV
app.get('/download-completed-tasks', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getCompletedToDosQuery = 'SELECT task, completed_at FROM todos WHERE user_id = ? AND done = TRUE ORDER BY completed_at DESC';
    db.query(getCompletedToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        const fields = ['task', 'completed_at'];
        const json2csvParser = new Parser({
            fields
        });
        const csv = json2csvParser.parse(results);
        res.header('Content-Type', 'text/csv');
        res.attachment('completed_tasks.csv');
        res.send(csv);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});