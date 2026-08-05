const express = require('express');
const session = require('express-session');
const path = require('path');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const panelRoutes = require('./routes/panel');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'clave_secreta_sgci_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }
  })
);

app.use('/', authRoutes);
app.use('/', panelRoutes);

app.use((req, res) => {
  res.status(404).render('mensaje', { titulo: 'No encontrado', error: 'La página solicitada no existe.' });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log('SGCI corriendo en http://localhost:' + PORT);
});
