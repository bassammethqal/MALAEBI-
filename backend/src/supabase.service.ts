import { Injectable, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  authClient!: SupabaseClient;
  adminClient!: SupabaseClient;
  onModuleInit() {
    const url=process.env.SUPABASE_URL;
    const anon=process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url || !anon || !secret) throw new ServiceUnavailableException('Supabase environment variables are not configured');
    this.authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    this.adminClient=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  }
  async getUser(accessToken:string) {
    const {data,error}=await this.authClient.auth.getUser(accessToken);
    if(error || !data.user) throw new UnauthorizedException('Invalid or expired Supabase access token');
    return data.user;
  }
  async ensureBucket(bucketName = 'venue-images', isPublic = true) {
    try {
      const { data: bucket, error } = await this.adminClient.storage.getBucket(bucketName);
      if (error || !bucket) {
        await this.adminClient.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
        });
      }
    } catch (e) {
      // Ignored if already created or permission
    }
  }
}
