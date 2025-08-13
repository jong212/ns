import { NewsArticle } from '@/lib/types';
import { formatDistanceToNow, extractDomain, truncateText } from '@/lib/utils';
import Image from 'next/image';

interface NewsCardProps {
  article: NewsArticle;
  onClick?: (article: NewsArticle) => void;
}

export function NewsCard({ article, onClick }: NewsCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(article);
    } else {
      // 기본 동작: 새 탭에서 기사 열기
      window.open(article.article_url, '_blank');
    }
  };

  return (
    <div 
      className="group relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-white/20 overflow-hidden transform hover:-translate-y-2"
      onClick={handleClick}
    >
      {/* 그라데이션 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* 썸네일 이미지 */}
      {article.thumbnail_url && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* 이미지 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      )}

      <div className="relative p-6">
        {/* 제목 - 이미지 아래에 배치하고 가독성 개선 */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 mb-3 border border-gray-100">
          <h3 className="text-xl font-bold line-clamp-2 group-hover:text-pink-600 transition-colors duration-200 leading-tight text-gray-900 drop-shadow-sm">
            {article.title}
          </h3>
        </div>

        {/* 요약 */}
        {article.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
            {truncateText(article.summary, 150)}
          </p>
        )}

        {/* 출연자 태그 */}
        {article.cast_members && article.cast_members.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.cast_members.slice(0, 3).map((member, index) => (
              <span
                key={index}
                className="inline-block bg-gradient-to-r from-pink-100 to-purple-100 text-pink-800 text-xs px-3 py-1.5 rounded-full font-medium border border-pink-200/50"
              >
                {member}
              </span>
            ))}
            {article.cast_members.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full font-medium">
                +{article.cast_members.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 키워드 태그 */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {article.keywords.slice(0, 2).map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 text-xs px-3 py-1.5 rounded-full font-medium border border-blue-200/50"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-100/50">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-pink-700">
                {article.source || extractDomain(article.article_url)}
              </span>
            </div>
            {article.cluster_id && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-medium">
                클러스터
              </span>
            )}
          </div>
          
          <div className="text-xs text-gray-500 font-medium">
            {article.published_at 
              ? formatDistanceToNow(article.published_at)
              : '날짜 미상'
            }
          </div>
        </div>

        {/* 호버 효과 - 읽기 버튼 */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <span className="text-pink-600 text-sm font-medium">📖 읽기</span>
          </div>
        </div>
      </div>
    </div>
  );
}
