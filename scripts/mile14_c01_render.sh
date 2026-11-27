cd /home/user/pov-studio
python3 scripts/mile14_c01_env.py >> out/mile14/c01.log 2>&1 || { echo FAIL >> out/mile14/c01.log; exit 1; }
npx remotion render Mile14-C01-Raw out/mile14/c01-raw.mp4 --scale=1 --crf=14 --concurrency=1 --browser-executable=/opt/pw-browsers/chromium > out/mile14/c01.log 2>&1 || { echo FAIL >> out/mile14/c01.log; exit 1; }
python3 scripts/mile14_c01_assets.py >> out/mile14/c01.log 2>&1 || { echo FAIL >> out/mile14/c01.log; exit 1; }
ffmpeg -v error -y -i out/mile14/c01-raw.mp4 -i out/mile14/c01/mix.wav -filter_complex "[0:v]v360=input=flat:ih_fov=130:iv_fov=100.6:output=fisheye:h_fov=115:v_fov=64.7:w=1920:h=1080:interp=lanczos,ass=out/mile14/c01/subs.ass[v]" -map "[v]" -map 1:a -r 30 -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest out/mile14/c01-full.part.mp4 && mv out/mile14/c01-full.part.mp4 out/mile14/c01-full.mp4 && echo DONE >> out/mile14/c01.log
