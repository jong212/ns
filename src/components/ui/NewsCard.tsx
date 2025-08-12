import { NewsArticle } from '@/lib/types';
import { formatDistanceToNow, extractDomain, truncateText } from '@/lib/utils';
import Link from 'next/link';
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
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-100 overflow-hidden group"
      onClick={handleClick}
    >
      {/* 썸네일 이미지 */}
      {article.thumbnail_url && (
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={article.thumbnail_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      <div className="p-4">
        {/* 제목 */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>

        {/* 요약 */}
        {article.summary && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-3">
            {truncateText(article.summary, 150)}
          </p>
        )}

        {/* 출연자 태그 */}
        {article.cast_members && article.cast_members.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.cast_members.slice(0, 3).map((member, index) => (
              <span
                key={index}
                className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full"
              >
                {member}
              </span>
            ))}
            {article.cast_members.length > 3 && (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                +{article.cast_members.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 키워드 태그 */}
        {article.keywords && article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.keywords.slice(0, 2).map((keyword, index) => (
              <span
                key={index}
                className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex justify-between items-center text-sm text-gray-500 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="font-medium">
              {article.source || extractDomain(article.article_url)}
            </span>
            {article.cluster_id && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                클러스터
              </span>
            )}
          </div>
          
          <span>
            {article.published_at 
              ? formatDistanceToNow(article.published_at)
              : '날짜 미상'
            }
          </span>
        </div>
      </div>
    </div>
  );
}
