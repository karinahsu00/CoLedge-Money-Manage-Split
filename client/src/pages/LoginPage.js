import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const history = useHistory();

    const handleLogin = async (e) => {
        e.preventDefault();
        // Implement login functionality here. E.g., call your API
        // On success, redirect to the dashboard
        if (/* login success */) {
            history.push('/dashboard');
        } else {
            alert('Login failed');
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        // Implement signup functionality here. E.g., call your API
        // On success, redirect to the login page
        if (/* signup success */) {
            alert('Signup successful, please login.');
            setIsSignup(false);
        } else {
            alert('Signup failed');
        }
    };

    const toggleSignup = () => {
        setIsSignup(!isSignup);
    };

    return (
        <div>
            <h2>{isSignup ? 'Signup' : 'Login'}</h2>
            <form onSubmit={isSignup ? handleSignup : handleLogin}>
                <input
                    type='email'
                    placeholder='Email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type='password'
                    placeholder='Password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type='submit'>{isSignup ? 'Signup' : 'Login'}</button>
            </form>
            <button onClick={toggleSignup}>
                {isSignup ? 'Already have an account? Login' : 'Don’t have an account? Signup'}
            </button>
        </div>
    );
};

export default LoginPage;