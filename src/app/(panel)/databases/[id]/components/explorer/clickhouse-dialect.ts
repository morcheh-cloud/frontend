import { SQLDialect } from "@codemirror/lang-sql"

// ClickHouse's SQL for CodeMirror: backtick or double-quoted names,
// backslash escapes in strings, `--` and `#` comments, and its own keywords,
// functions and types (the common ones; completion also offers the tables).
export const ClickHouseSQL = SQLDialect.define({
  keywords:
    "add after alias all alter and anti any array as asc asof attach between both by case cast check clear cluster codec collate column comment constraint create cross cube database databases default delete desc describe detach dictionaries dictionary distinct distributed drop else end engine events exchange exists explain expression final first format freeze from full function global granularity group having if ilike in index inf inner insert interval into is join key kill last layout left lifetime like limit live local materialized materialize modify move mutation nan not null nulls offset on optimize or order outer outfile over partition paste populate prewhere primary projection query range rename replace right rollup sample select semi set settings show source start sync system table tables temporary test then ties to top totals truncate ttl type union update use using uuid values view watch when where window with fill step interpolate qualify",
  builtin:
    "count sum avg min max any anyLast argMin argMax uniq uniqExact uniqCombined groupArray groupUniqArray quantile quantiles quantileExact median topK countIf sumIf avgIf minIf maxIf uniqIf now now64 today yesterday toDate toDate32 toDateTime toDateTime64 toStartOfDay toStartOfHour toStartOfMinute toStartOfWeek toStartOfMonth toStartOfYear toStartOfInterval toYYYYMM toYYYYMMDD toYear toMonth toDayOfWeek toHour dateDiff dateAdd dateSub formatDateTime parseDateTimeBestEffort toString toInt32 toInt64 toUInt32 toUInt64 toFloat64 toDecimal64 toUUID toTypeName length lower upper concat substring position replaceAll replaceRegexpAll match extract splitByChar arrayJoin arrayMap arrayFilter arrayExists has hasAny indexOf empty notEmpty if multiIf coalesce ifNull nullIf isNull isNotNull round floor ceil abs exp log rand generateUUIDv4 cityHash64 sipHash64 JSONExtract JSONExtractString JSONExtractInt visitParamExtractString formatReadableSize formatReadableQuantity currentDatabase version uptime hostName bar",
  types:
    "UInt8 UInt16 UInt32 UInt64 UInt128 UInt256 Int8 Int16 Int32 Int64 Int128 Int256 Float32 Float64 BFloat16 Decimal Decimal32 Decimal64 Decimal128 Decimal256 Bool Boolean String FixedString UUID Date Date32 DateTime DateTime64 Enum Enum8 Enum16 LowCardinality Array Tuple Map Nested Nullable IPv4 IPv6 JSON Object Dynamic Variant Point Ring Polygon MultiPolygon AggregateFunction SimpleAggregateFunction Nothing Interval MergeTree ReplacingMergeTree SummingMergeTree AggregatingMergeTree CollapsingMergeTree VersionedCollapsingMergeTree ReplicatedMergeTree Log TinyLog StripeLog Memory Buffer Distributed Merge Null Dictionary Kafka S3 URL File",
  backslashEscapes: true,
  hashComments: true,
  identifierQuotes: '`"',
  caseInsensitiveIdentifiers: false,
})
