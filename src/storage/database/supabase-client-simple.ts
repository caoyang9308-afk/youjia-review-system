import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 直接使用配置，不依赖环境变量
const supabaseUrl = "https://br-grand-grue-b150b09a.supabase2.aidap-global.cn-beijing.volces.com";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNjUxMjEwNzEsInJvbGUiOiJhbm9uIn0.-oSG7Uvdp4dy_szwTde1pHNgklJjrXWFLGoQptkqfrU";
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNjUxMjEwNzEsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.7HOv0t047p8qwWOI81Q9lb2MlxEh5MWyB60J-i0SDmI";

// 客户端（浏览器端）- 使用 anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 服务端（API Routes）- 使用 service_role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
