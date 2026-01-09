
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, app } from "../../lib/firebase";
import { UserRole } from "../../frontend/types";
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const auth = getAuth(app);

async function createAdmin(email: string, pass: string, role: UserRole, firstName: string, lastName: string, contactNumber: string) {
    if (role !== 'admin' && role !== 'superadmin') {
        throw new Error('Role must be either "admin" or "superadmin"');
    }

    try {
        console.log(`Creating user with email: ${email} and role: ${role}`);
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, pass);

        // Send the verification email
        await sendEmailVerification(firebaseUser);
        console.log(`Successfully sent verification email to ${email}`);

        const newUser = {
            role: role,
            firstName: firstName,
            lastName: lastName,
            emailAddress: email,
            emailVerified: false,
            contactNumber: contactNumber,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", firebaseUser.uid), newUser);
        console.log(`Successfully created user with UID: ${firebaseUser.uid}`);
        process.exit(0);
    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exit(1);
    }
}

const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 --email <email> --pass <password> --role <role> --firstName <firstName> --lastName <lastName> --contactNumber <contactNumber>')
    .option('email', { alias: 'e', describe: 'Admin email', type: 'string', demandOption: true })
    .option('pass', { alias: 'p', describe: 'Admin password', type: 'string', demandOption: true })
    .option('role', { alias: 'r', describe: 'User role (admin or superadmin)', type: 'string', demandOption: true })
    .option('firstName', { alias: 'f', describe: 'First name', type: 'string', demandOption: true })
    .option('lastName', { alias: 'l', describe: 'Last name', type: 'string', demandOption: true })
    .option('contactNumber', { alias: 'c', describe: 'Contact number', type: 'string', demandOption: true })
    .argv;

createAdmin(argv.email, argv.pass, argv.role as UserRole, argv.firstName, argv.lastName, argv.contactNumber);
