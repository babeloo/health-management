"""
Education Article Router
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from app.models import Article, ArticleListResponse
from app.services import article_service
from app.middleware import get_current_user, JWTUser

router = APIRouter(prefix="/api/v1/education", tags=["Education"])


@router.get("/articles", response_model=ArticleListResponse)
async def get_articles(
    category: str = Query(None, description="文章分类"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
):
    """
    获取科普文章列表

    - 支持按分类筛选
    - 支持分页
    - 按创建时间倒序
    """
    try:
        articles, total = await article_service.get_articles(
            category=category, page=page, page_size=page_size
        )

        return ArticleListResponse(total=total, items=articles, page=page, page_size=page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文章列表失败: {str(e)}")


@router.get("/articles/{article_id}", response_model=Article)
async def get_article(article_id: str):
    """
    获取文章详情

    - 自动增加浏览量
    - 使用Redis缓存
    """
    try:
        article = await article_service.get_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="文章不存在")

        return article
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文章详情失败: {str(e)}")


@router.post("/articles/{article_id}/favorite")
async def favorite_article(article_id: str, current_user: JWTUser = Depends(get_current_user)):
    """
    收藏文章

    - 幂等操作（重复收藏不报错）
    - 需要JWT认证
    """
    try:
        user_id = current_user.user_id
        success = await article_service.add_favorite(user_id, article_id)
        return {"success": success, "message": "收藏成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"收藏失败: {str(e)}")


@router.delete("/articles/{article_id}/favorite")
async def unfavorite_article(article_id: str, current_user: JWTUser = Depends(get_current_user)):
    """
    取消收藏文章

    - 需要JWT认证
    """
    try:
        user_id = current_user.user_id
        success = await article_service.remove_favorite(user_id, article_id)
        return {"success": success, "message": "取消收藏成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取消收藏失败: {str(e)}")


@router.get("/favorites")
async def get_user_favorites(
    current_user: JWTUser = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    获取用户收藏的文章列表

    - 需要JWT认证
    """
    try:
        user_id = current_user.user_id
        articles, total = await article_service.get_user_favorites(
            user_id, page=page, page_size=page_size
        )

        return ArticleListResponse(total=total, items=articles, page=page, page_size=page_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取收藏列表失败: {str(e)}")
