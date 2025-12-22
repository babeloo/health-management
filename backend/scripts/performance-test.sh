#!/bin/bash

# InfluxDB 性能测试脚本
# 目标：验证查询响应时间 < 100ms

set -e

INFLUX_URL="http://localhost:8086"
INFLUX_TOKEN="my-super-secret-auth-token"
INFLUX_ORG="vakyi"
INFLUX_BUCKET="health_data"
USER_ID="test_user_123"

echo "======================================"
echo "InfluxDB 性能测试"
echo "======================================"

# 1. 写入测试数据（血压）
echo ""
echo "📝 写入血压测试数据..."
for i in {1..50}; do
  TIMESTAMP=$(date -u -d "$i days ago" +%s)
  SYSTOLIC=$((100 + RANDOM % 40))
  DIASTOLIC=$((60 + RANDOM % 30))
  PULSE=$((60 + RANDOM % 40))

  curl -s -XPOST "${INFLUX_URL}/api/v2/write?org=${INFLUX_ORG}&bucket=${INFLUX_BUCKET}&precision=s" \
    --header "Authorization: Token ${INFLUX_TOKEN}" \
    --data-raw "blood_pressure,user_id=${USER_ID},check_in_id=test_${i} systolic=${SYSTOLIC},diastolic=${DIASTOLIC},pulse=${PULSE} ${TIMESTAMP}" > /dev/null
done
echo "✅ 已写入 50 条血压数据"

# 2. 写入测试数据（血糖）
echo ""
echo "📝 写入血糖测试数据..."
TIMINGS=("fasting" "postprandial" "random")
for i in {1..50}; do
  TIMESTAMP=$(date -u -d "$i days ago" +%s)
  TIMING=${TIMINGS[$((RANDOM % 3))]}
  VALUE=$(echo "4.5 + $RANDOM % 50 / 10" | bc -l | awk '{printf "%.1f", $0}')

  curl -s -XPOST "${INFLUX_URL}/api/v2/write?org=${INFLUX_ORG}&bucket=${INFLUX_BUCKET}&precision=s" \
    --header "Authorization: Token ${INFLUX_TOKEN}" \
    --data-raw "blood_sugar,user_id=${USER_ID},check_in_id=test_${i},timing=${TIMING} value=${VALUE} ${TIMESTAMP}" > /dev/null
done
echo "✅ 已写入 50 条血糖数据"

# 等待数据写入完成
sleep 2

# 3. 性能测试：查询最近 7 天血压趋势
echo ""
echo "⚡ 性能测试 1: 查询最近 7 天血压趋势（按天聚合）"
QUERY_1='from(bucket: "health_data")
  |> range(start: -7d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_pressure" and
      r.user_id == "test_user_123"
  )
  |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> keep(columns: ["_time", "systolic", "diastolic", "pulse"])
  |> sort(columns: ["_time"], desc: false)'

START=$(date +%s%N)
RESULT_1=$(curl -s -XPOST "${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}" \
  --header "Authorization: Token ${INFLUX_TOKEN}" \
  --header "Content-Type: application/vnd.flux" \
  --data "${QUERY_1}")
END=$(date +%s%N)
ELAPSED_MS=$(( (END - START) / 1000000 ))

echo "   响应时间: ${ELAPSED_MS}ms"
if [ $ELAPSED_MS -lt 100 ]; then
  echo "   ✅ 性能达标（< 100ms）"
else
  echo "   ⚠️  性能未达标（目标 < 100ms）"
fi

# 4. 性能测试：查询最近 30 天血糖平均值
echo ""
echo "⚡ 性能测试 2: 查询最近 30 天血糖平均值（按测量时机分组）"
QUERY_2='from(bucket: "health_data")
  |> range(start: -30d, stop: now())
  |> filter(fn: (r) =>
      r._measurement == "blood_sugar" and
      r.user_id == "test_user_123" and
      r._field == "value"
  )
  |> group(columns: ["timing"])
  |> mean()
  |> rename(columns: {_value: "avg_value"})
  |> keep(columns: ["timing", "avg_value"])'

START=$(date +%s%N)
RESULT_2=$(curl -s -XPOST "${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}" \
  --header "Authorization: Token ${INFLUX_TOKEN}" \
  --header "Content-Type: application/vnd.flux" \
  --data "${QUERY_2}")
END=$(date +%s%N)
ELAPSED_MS=$(( (END - START) / 1000000 ))

echo "   响应时间: ${ELAPSED_MS}ms"
if [ $ELAPSED_MS -lt 100 ]; then
  echo "   ✅ 性能达标（< 100ms）"
else
  echo "   ⚠️  性能未达标（目标 < 100ms）"
fi

# 5. 性能测试：查询指定时间范围的血压统计
echo ""
echo "⚡ 性能测试 3: 查询指定时间范围的血压统计（聚合查询）"
START_TIME=$(date -u -d "30 days ago" --iso-8601=seconds)
STOP_TIME=$(date -u --iso-8601=seconds)

QUERY_3="from(bucket: \"health_data\")
  |> range(start: ${START_TIME}, stop: ${STOP_TIME})
  |> filter(fn: (r) =>
      r._measurement == \"blood_pressure\" and
      r.user_id == \"test_user_123\"
  )
  |> group(columns: [\"_field\"])
  |> reduce(
      fn: (r, accumulator) => ({
          _field: r._field,
          mean: accumulator.mean + r._value,
          max: if r._value > accumulator.max then r._value else accumulator.max,
          min: if r._value < accumulator.min then r._value else accumulator.min,
          count: accumulator.count + 1.0
      }),
      identity: {_field: \"\", mean: 0.0, max: 0.0, min: 999.0, count: 0.0}
  )
  |> map(fn: (r) => ({
      r with
      mean: r.mean / r.count
  }))
  |> keep(columns: [\"_field\", \"mean\", \"max\", \"min\", \"count\"])"

START=$(date +%s%N)
RESULT_3=$(curl -s -XPOST "${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}" \
  --header "Authorization: Token ${INFLUX_TOKEN}" \
  --header "Content-Type: application/vnd.flux" \
  --data "${QUERY_3}")
END=$(date +%s%N)
ELAPSED_MS=$(( (END - START) / 1000000 ))

echo "   响应时间: ${ELAPSED_MS}ms"
if [ $ELAPSED_MS -lt 100 ]; then
  echo "   ✅ 性能达标（< 100ms）"
else
  echo "   ⚠️  性能未达标（目标 < 100ms）"
fi

# 6. 清理测试数据
echo ""
echo "🧹 清理测试数据..."
DELETE_PREDICATE="user_id=\"${USER_ID}\""
START_DELETE=$(date -u -d "60 days ago" --iso-8601=seconds)
STOP_DELETE=$(date -u --iso-8601=seconds)

curl -s -XPOST "${INFLUX_URL}/api/v2/delete?org=${INFLUX_ORG}&bucket=${INFLUX_BUCKET}" \
  --header "Authorization: Token ${INFLUX_TOKEN}" \
  --header "Content-Type: application/json" \
  --data "{\"start\":\"${START_DELETE}\",\"stop\":\"${STOP_DELETE}\",\"predicate\":\"${DELETE_PREDICATE}\"}" > /dev/null

echo "✅ 测试数据已清理"

echo ""
echo "======================================"
echo "性能测试完成"
echo "======================================"
