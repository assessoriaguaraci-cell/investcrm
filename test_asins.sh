asins=("B01ACFIWT8" "B01LTGO432" "B071V8Z1F1" "B0785125ST" "B081S11Y89" "B0B377K7C8" "B0CB4T9NTS" "B0DB7ST4LM" "B0CFWCXQ6Y" "B085TMFX1X" "B00EUB0F4A" "B07QCV7T7M" "B00AWC320Y" "B00A0EDJAE")
for asin in "${asins[@]}"; do
    res=$(curl -sI "https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg" | head -n 1)
    len=$(curl -sI "https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg" | grep -i Content-Length | awk '{print $2}')
    echo "$asin: $res $len"
done
