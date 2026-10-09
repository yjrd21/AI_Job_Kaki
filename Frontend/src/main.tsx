import React from 'react';import ReactDOM from 'react-dom/client';import {App} from './app/App';import {AuthProvider} from './features/auth/presentation/AuthProvider';import {QueryProvider} from './app/providers/QueryProvider';import './styles/globals.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<QueryProvider><AuthProvider><App/></AuthProvider></QueryProvider>);
