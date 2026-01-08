#!/usr/bin/env python3
"""
AI功能集成测试脚本
测试后端与AI服务的集成情况
"""

import requests
import json
import sys
from datetime import datetime

# 配置
BACKEND_URL = "http://localhost:5000/api/v1"
AI_SERVICE_URL = "http://localhost:8001"

# 全局变量
token = None
conversation_id = None
test_results = []


def log_test(name, success, message="", response_data=None):
    """记录测试结果"""
    result = {
        "test_name": name,
        "success": success,
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "response_data": response_data
    }
    test_results.append(result)

    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status} - {name}")
    if message:
        print(f"   {message}")
    if not success and response_data:
        print(f"   Response: {json.dumps(response_data, indent=2, ensure_ascii=False)}")


def test_1_login():
    """测试1: 用户登录获取Token"""
    global token

    print("\n" + "="*60)
    print("测试 1: 用户登录获取Token")
    print("="*60)

    url = f"{BACKEND_URL}/auth/login"
    payload = {
        "username": "testuser",
        "password": "Test123456"
    }

    try:
        response = requests.post(url, json=payload)
        data = response.json()

        if response.status_code == 200 and "accessToken" in data:
            token = data["accessToken"]
            log_test(
                "用户登录",
                True,
                f"成功获取Token (前20字符): {token[:20]}...",
                {"user": data.get("user", {})}
            )
            return True
        else:
            log_test("用户登录", False, f"登录失败: {data.get('message', '未知错误')}", data)
            return False

    except Exception as e:
        log_test("用户登录", False, f"请求异常: {str(e)}")
        return False


def test_2_ai_chat():
    """测试2: AI聊天对话（通过后端代理）"""
    global conversation_id

    print("\n" + "="*60)
    print("测试 2: AI聊天对话")
    print("="*60)

    if not token:
        log_test("AI聊天对话", False, "未登录，跳过测试")
        return False

    url = f"{BACKEND_URL}/ai/chat"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "message": "我最近血压偏高，应该注意什么？"
    }

    try:
        print(f"发送消息: {payload['message']}")
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        data = response.json()

        if response.status_code == 200:
            conversation_id = data.get("conversation_id")
            reply = data.get("reply", "")

            log_test(
                "AI聊天对话",
                True,
                f"AI回复长度: {len(reply)} 字符\n   对话ID: {conversation_id}\n   回复预览: {reply[:100]}...",
                {"conversation_id": conversation_id, "reply_preview": reply[:200]}
            )
            return True
        else:
            log_test("AI聊天对话", False, f"请求失败: {data.get('message', '未知错误')}", data)
            return False

    except Exception as e:
        log_test("AI聊天对话", False, f"请求异常: {str(e)}")
        return False


def test_3_conversation_history():
    """测试3: 获取对话历史"""
    print("\n" + "="*60)
    print("测试 3: 获取对话历史")
    print("="*60)

    if not token:
        log_test("获取对话历史", False, "未登录，跳过测试")
        return False

    if not conversation_id:
        log_test("获取对话历史", False, "没有对话ID，跳过测试")
        return False

    url = f"{BACKEND_URL}/ai/conversations/{conversation_id}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers)
        data = response.json()

        if response.status_code == 200:
            messages = data.get("messages", [])
            log_test(
                "获取对话历史",
                True,
                f"成功获取 {len(messages)} 条消息",
                {"message_count": len(messages), "messages": messages[:2]}
            )
            return True
        else:
            log_test("获取对话历史", False, f"请求失败: {data.get('message', '未知错误')}", data)
            return False

    except Exception as e:
        log_test("获取对话历史", False, f"请求异常: {str(e)}")
        return False


def test_4_education_articles():
    """测试4: 科普文章列表"""
    print("\n" + "="*60)
    print("测试 4: 科普文章列表")
    print("="*60)

    if not token:
        log_test("科普文章列表", False, "未登录，跳过测试")
        return False

    url = f"{BACKEND_URL}/education/articles"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"page": 1, "pageSize": 10}

    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()

        if response.status_code == 200:
            articles = data.get("data", [])
            total = data.get("total", 0)

            log_test(
                "科普文章列表",
                True,
                f"成功获取 {len(articles)} 篇文章（共 {total} 篇）",
                {"article_count": len(articles), "total": total, "articles": articles[:2]}
            )
            return True
        else:
            log_test("科普文章列表", False, f"请求失败: {data.get('message', '未知错误')}", data)
            return False

    except Exception as e:
        log_test("科普文章列表", False, f"请求异常: {str(e)}")
        return False


def test_5_ai_service_health():
    """测试5: AI服务健康检查"""
    print("\n" + "="*60)
    print("测试 5: AI服务健康检查")
    print("="*60)

    url = f"{AI_SERVICE_URL}/health"

    try:
        response = requests.get(url, timeout=5)
        data = response.json()

        if response.status_code == 200 and data.get("status") == "ok":
            log_test(
                "AI服务健康检查",
                True,
                "AI服务运行正常",
                data
            )
            return True
        else:
            log_test("AI服务健康检查", False, "AI服务状态异常", data)
            return False

    except Exception as e:
        log_test("AI服务健康检查", False, f"无法连接AI服务: {str(e)}")
        return False


def generate_report():
    """生成测试报告"""
    print("\n" + "="*60)
    print("测试报告汇总")
    print("="*60)

    total_tests = len(test_results)
    passed_tests = sum(1 for r in test_results if r["success"])
    failed_tests = total_tests - passed_tests

    print(f"\n总测试数: {total_tests}")
    print(f"通过: {passed_tests} ✅")
    print(f"失败: {failed_tests} ❌")
    print(f"通过率: {(passed_tests/total_tests*100):.1f}%")

    print("\n详细结果:")
    for i, result in enumerate(test_results, 1):
        status = "✅" if result["success"] else "❌"
        print(f"{i}. {status} {result['test_name']}")
        if result["message"]:
            print(f"   {result['message']}")

    # 保存报告到文件
    report_file = "docs/reports/integration-test-report-2026-01-06.md"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# AI功能集成测试报告\n\n")
        f.write(f"**测试时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**测试环境**:\n")
        f.write(f"- 后端服务: {BACKEND_URL}\n")
        f.write(f"- AI服务: {AI_SERVICE_URL}\n\n")
        f.write(f"## 测试结果\n\n")
        f.write(f"- 总测试数: {total_tests}\n")
        f.write(f"- 通过: {passed_tests} ✅\n")
        f.write(f"- 失败: {failed_tests} ❌\n")
        f.write(f"- 通过率: {(passed_tests/total_tests*100):.1f}%\n\n")
        f.write(f"## 详细测试结果\n\n")

        for i, result in enumerate(test_results, 1):
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            f.write(f"### {i}. {result['test_name']} - {status}\n\n")
            f.write(f"- **时间**: {result['timestamp']}\n")
            if result["message"]:
                f.write(f"- **说明**: {result['message']}\n")
            if result["response_data"]:
                f.write(f"- **响应数据**:\n```json\n{json.dumps(result['response_data'], indent=2, ensure_ascii=False)}\n```\n")
            f.write("\n")

        # 添加结论
        f.write("## 测试结论\n\n")
        if failed_tests == 0:
            f.write("✅ **所有测试通过！** AI功能集成测试成功完成。\n\n")
            f.write("### 已验证功能\n\n")
            f.write("1. 用户认证（JWT Token）\n")
            f.write("2. AI聊天对话（后端代理）\n")
            f.write("3. 对话历史查询\n")
            f.write("4. 科普文章列表\n")
            f.write("5. AI服务健康状态\n")
        else:
            f.write(f"⚠️ **有 {failed_tests} 个测试失败，需要修复。**\n\n")
            f.write("### 失败的测试\n\n")
            for result in test_results:
                if not result["success"]:
                    f.write(f"- {result['test_name']}: {result['message']}\n")

    print(f"\n测试报告已保存到: {report_file}")

    return failed_tests == 0


def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("AI功能集成测试")
    print("="*60)
    print(f"后端URL: {BACKEND_URL}")
    print(f"AI服务URL: {AI_SERVICE_URL}")
    print("="*60)

    # 执行测试
    tests = [
        test_1_login,
        test_2_ai_chat,
        test_3_conversation_history,
        test_4_education_articles,
        test_5_ai_service_health
    ]

    for test in tests:
        try:
            test()
        except KeyboardInterrupt:
            print("\n\n测试被用户中断")
            sys.exit(1)
        except Exception as e:
            print(f"\n测试执行异常: {str(e)}")

    # 生成报告
    success = generate_report()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
