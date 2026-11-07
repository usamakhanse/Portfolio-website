
// =====================================
// DARK AND LIGHT MODE
// =====================================

const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("portfolioTheme");

if (savedTheme === "light") {
    document.body.classList.add("light-mode");
}

function updateThemeButton() {
    if (document.body.classList.contains("light-mode")) {
        themeToggle.textContent = "🌙 Dark";
    } else {
        themeToggle.textContent = "☀️ Light";
    }
}

updateThemeButton();

themeToggle.addEventListener("click", function () {

    document.body.classList.toggle("light-mode");

    if (document.body.classList.contains("light-mode")) {
        localStorage.setItem("portfolioTheme", "light");
    } else {
        localStorage.setItem("portfolioTheme", "dark");
    }

    updateThemeButton();

});


// =====================================
// LOCAL DEMO AUTHENTICATION
// =====================================

const authButton = document.getElementById("authBtn");
const authModal = document.getElementById("loginModal");
const authCloseButton = document.getElementById("closeModal");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authMessage = document.getElementById("loginMessage");
const authForms = {
    login: document.getElementById("loginForm"),
    signup: document.getElementById("signupForm"),
    reset: document.getElementById("resetForm")
};
const accountsStorageKey = "portfolioAccounts";
const sessionStorageKey = "portfolioSessionEmail";
const passwordIterations = 210000;
let signedInEmail = localStorage.getItem(sessionStorageKey);

function showAuthMessage(text, state) {
    authMessage.textContent = text;
    authMessage.dataset.state = state || "";
}

function changeAuthView(view) {
    const headings = {
        login: ["Welcome Back!", "Log in to your portfolio account"],
        signup: ["Create Account", "Create an account on this browser"],
        reset: ["Reset Password", "Set a new password for your local account"]
    };

    Object.keys(authForms).forEach(function (name) {
        authForms[name].hidden = name !== view;
    });
    authTitle.textContent = headings[view][0];
    authSubtitle.textContent = headings[view][1];
    showAuthMessage("", "");
}

function readAccounts() {
    const storedAccounts = localStorage.getItem(accountsStorageKey);
    const accounts = storedAccounts ? JSON.parse(storedAccounts) : [];

    if (!Array.isArray(accounts)) {
        throw new Error("Stored account data is invalid.");
    }

    return accounts;
}

function saveAccounts(accounts) {
    localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function encodeBytes(bytes) {
    let binary = "";
    bytes.forEach(function (byte) {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function decodeBytes(encoded) {
    return Uint8Array.from(atob(encoded), function (character) {
        return character.charCodeAt(0);
    });
}

async function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Password hashing needs a secure browser context. Open this site through localhost or HTTPS.");
    }

    const key = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const hash = await window.crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt, iterations: passwordIterations, hash: "SHA-256" },
        key,
        256
    );

    return new Uint8Array(hash);
}

function passwordMatches(first, second) {
    if (first.length !== second.length) {
        return false;
    }

    let difference = 0;
    for (let index = 0; index < first.length; index += 1) {
        difference |= first[index] ^ second[index];
    }
    return difference === 0;
}

function setSignedIn(email) {
    signedInEmail = email;
    if (email) {
        localStorage.setItem(sessionStorageKey, email);
        authButton.textContent = "Logout";
        authButton.title = "Logged in as " + email;
        authButton.setAttribute("aria-label", "Log out");
    } else {
        localStorage.removeItem(sessionStorageKey);
        authButton.textContent = "Login";
        authButton.title = "Log in";
        authButton.setAttribute("aria-label", "Log in");
    }
}

function closeAuthModal() {
    authModal.style.display = "none";
    showAuthMessage("", "");
}

function openAuthModal() {
    changeAuthView("login");
    authModal.style.display = "flex";
    document.getElementById("loginEmail").focus();
}

function setAuthBusy(isBusy) {
    authModal.querySelectorAll('button[type="submit"]').forEach(function (button) {
        button.disabled = isBusy;
    });
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    showAuthMessage("", "");
    setAuthBusy(true);

    try {
        const form = event.currentTarget;
        const accounts = readAccounts();

        if (form === authForms.signup) {
            const email = document.getElementById("signupEmail").value.trim().toLowerCase();
            const password = document.getElementById("signupPassword").value;
            const confirmation = document.getElementById("signupConfirmPassword").value;

            if (password !== confirmation) {
                showAuthMessage("Passwords do not match.", "error");
                return;
            }
            if (accounts.some(function (account) { return account.email === email; })) {
                showAuthMessage("An account already exists for this email. Please log in.", "error");
                return;
            }

            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const passwordHash = await hashPassword(password, salt);
            accounts.push({
                email: email,
                salt: encodeBytes(salt),
                passwordHash: encodeBytes(passwordHash),
                iterations: passwordIterations
            });
            saveAccounts(accounts);
            authForms.signup.reset();
            document.getElementById("loginEmail").value = email;
            document.getElementById("loginPassword").value = "";
            changeAuthView("login");
            showAuthMessage("Account created. Please log in with your new account.", "success");
        } else if (form === authForms.login) {
            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;
            const account = accounts.find(function (item) { return item.email === email; });

            if (!account) {
                showAuthMessage("No account found for this email. Sign up first.", "error");
                return;
            }

            const actualHash = await hashPassword(password, decodeBytes(account.salt));
            if (!passwordMatches(actualHash, decodeBytes(account.passwordHash))) {
                showAuthMessage("Incorrect password. Please try again.", "error");
                return;
            }

            setSignedIn(email);
            showAuthMessage("Login successful.", "success");
            window.setTimeout(closeAuthModal, 900);
        } else if (form === authForms.reset) {
            const email = document.getElementById("resetEmail").value.trim().toLowerCase();
            const password = document.getElementById("resetPassword").value;
            const confirmation = document.getElementById("resetConfirmPassword").value;
            const accountIndex = accounts.findIndex(function (item) { return item.email === email; });

            if (password !== confirmation) {
                showAuthMessage("Passwords do not match.", "error");
                return;
            }
            if (accountIndex === -1) {
                showAuthMessage("No account found for this email.", "error");
                return;
            }

            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const passwordHash = await hashPassword(password, salt);
            accounts[accountIndex].salt = encodeBytes(salt);
            accounts[accountIndex].passwordHash = encodeBytes(passwordHash);
            accounts[accountIndex].iterations = passwordIterations;
            saveAccounts(accounts);
            setSignedIn(email);
            showAuthMessage("Password updated. You are now logged in.", "success");
            window.setTimeout(closeAuthModal, 900);
        }
    } catch (error) {
        console.error("Local authentication failed:", error);
        showAuthMessage(
            error.name === "QuotaExceededError"
                ? "Browser storage is full. Clear some site data and try again."
                : error.message || "Could not save your account. Please try again.",
            "error"
        );
    } finally {
        setAuthBusy(false);
    }
}

Object.keys(authForms).forEach(function (name) {
    authForms[name].addEventListener("submit", handleAuthSubmit);
});

document.querySelectorAll("[data-auth-mode]").forEach(function (button) {
    button.addEventListener("click", function () {
        changeAuthView(button.dataset.authMode);
    });
});

authButton.addEventListener("click", function () {
    if (signedInEmail) {
        setSignedIn(null);
    } else {
        openAuthModal();
    }
});

authCloseButton.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", function (event) {
    if (event.target === authModal) {
        closeAuthModal();
    }
});
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && authModal.style.display === "flex") {
        closeAuthModal();
    }
});

if (signedInEmail) {
    setSignedIn(signedInEmail);
}

// =====================================
// MOBILE NAVIGATION
// =====================================

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("active");
});

document.querySelectorAll(".nav-links a").forEach(function (link) {

    link.addEventListener("click", function () {
        navLinks.classList.remove("active");
    });

});


// =====================================
// CURRENT YEAR
// =====================================

const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}
