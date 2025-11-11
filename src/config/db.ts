import mongoose from 'mongoose';
import { ENV } from './env';


const connectDB = async () => {
    try {
        // Set a longer timeout if needed
        mongoose.set('bufferTimeoutMS', 30000); // Optional: increase timeout to 30 seconds

        // Make sure you have the correct URI
        const uri = ENV.MONGO_URI; // Make sure this is correctly set

        await mongoose.connect(uri);
        console.log('MongoDB connected');
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return false;
    }
};

export default connectDB;
