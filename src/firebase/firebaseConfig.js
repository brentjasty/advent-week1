import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnJ5CSUb4AQM7hmhJ4eQ_nTac4MAQeLOM",
  authDomain: "advent-b3755.firebaseapp.com",
  projectId: "advent-b3755",
  storageBucket: "advent-b3755.appspot.com",
  messagingSenderId: "504527654278",
  appId: "1:504527654278:web:b6f567141aa23304ca3007"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
