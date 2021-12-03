import { useEffect, useState } from 'react';
import { getData } from './getData.js';

const WIDTH = 300;

function parseSize(size) {
  if (size < 2) {
    return `${size * 10}mm`;
  }
  if (size < 100) {
    return `${size}cm`;
  }
  if (size < 100 * 1000) {
    return `${Math.round(size * 100) / 100 / 100}m`;
  }
  return `${Math.round(size / 100 / 10) / 100}km`;
}

function App() {
  const [data, dataSet] = useState([]);
  const [scroll, scrollSet] = useState(0);

  let compoundDistance = window.innerWidth / 2;

  useEffect(() => {
    getData().then((res) => {
      dataSet(res);
      document.body.style.height = `${WIDTH * res.length + window.innerHeight}px`;
    });

    function loop() {
      const newScroll = window.pageYOffset;
      scrollSet(newScroll);
      window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame(loop);
  }, []);

  return (
    <div className="emoji-display">
      {data.map(([emoji, size, label]) => {
        const width = window.innerWidth;
        let relativeDistance = compoundDistance - scroll;

        if (relativeDistance < width / 2) {
          relativeDistance =
            relativeDistance * 0.25 + (0.75 * (relativeDistance + width * 0.5)) / 2;
        }

        compoundDistance += WIDTH;

        if (relativeDistance < -WIDTH / 2 || relativeDistance > width - WIDTH / 2) {
          return null;
        }

        let emojisToScale = [Math.floor(scroll / WIDTH), Math.ceil(scroll / WIDTH)];

        emojisToScale = emojisToScale
          .map((idx) => {
            if (idx < 0) return 0;
            if (idx > data.length - 1) return data.length - 1;
            return idx;
          })
          .map((idx) => data[idx]);

        const floorCeilProgress = (scroll / WIDTH) % 1;
        const floatScale =
          floorCeilProgress * emojisToScale[1][1] + (1 - floorCeilProgress) * emojisToScale[0][1];

        const calculatedScale = Math.min(size / floatScale, 64);

        let opacity = 1;
        if (calculatedScale > 3) {
          const diff = (calculatedScale - 3) / 8;
          opacity = Math.max(1 - diff, 0);
        }

        return (
          <div
            className="emoji-container"
            style={{
              transform: `translatex(${relativeDistance}px)`
              // left: `${relativeDistance}px`
            }}
            key={emoji}
          >
            <div
              className={"emoji emoji-"+encodeURI(emoji).replace(/%/g, '')}
              style={{
                opacity,
                transform: `scale(${calculatedScale}) translateY(10%)`
              }}
            >
              {emoji}
            </div>
            <div>{parseSize(size)}</div>
            <div>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default App;
