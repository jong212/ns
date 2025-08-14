import { supabase } from '@/lib/supabase';

// 게시글 업로드용 버킷 이름 (대시보드에서 생성 필요: public 읽기 허용)
export const POST_UPLOAD_BUCKET = 'post-uploads';

export async function uploadImageForPost(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_UPLOAD_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(POST_UPLOAD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}


