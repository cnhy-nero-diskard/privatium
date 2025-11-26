import type { NextApiRequest, NextApiResponse } from 'next';
import { wipeDatabase } from '@/utils/supabaseClient';

type WipeResponse = {
  success: boolean;
  message?: string;
  deletedCounts?: Record<string, number>;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WipeResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify the encryption key from the request
    const { encryptionKey } = req.body;
    
    if (!encryptionKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Encryption key is required' 
      });
    }

    // Verify the provided encryption key matches the environment variable
    const actualEncryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;
    
    if (!actualEncryptionKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'Server encryption key not configured' 
      });
    }

    // Compare the keys securely
    if (encryptionKey !== actualEncryptionKey) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid encryption key. Database wipe denied.' 
      });
    }

    // If authentication passes, proceed with database wipe
    console.log('⚠️  Database wipe initiated...');
    const result = await wipeDatabase();

    if (result.success) {
      console.log('✅ Database wipe completed successfully');
      console.log('Deleted counts:', result.deletedCounts);
      return res.status(200).json({
        success: true,
        message: 'Database wiped successfully',
        deletedCounts: result.deletedCounts
      });
    } else {
      console.error('❌ Database wipe failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Database wipe failed'
      });
    }
  } catch (error) {
    console.error('Database wipe error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}
