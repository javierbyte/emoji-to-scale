import { useEffect, useState, Fragment } from 'react';
import { getData } from './getData.js';

function parseSize(size) {
  if (size < 2) {
    return `${size * 10}mm`;
  }
  if (size < 100) {
    return `${size}cm`;
  }
  if (size < 100 * 1000) {
    return `${Math.round(size * 100) / 10000}m`;
  }
  return `${Math.round(size / 100 / 10)}km`;
}

function App() {
  const [data, dataSet] = useState([]);
  const [scroll, scrollSet] = useState(0);

  let compoundDistance = window.innerWidth / 2;

  useEffect(() => {
    getData().then((res) => {
      dataSet(res);
      document.body.style.height = `${256 * res.length + window.innerHeight}px`;
    });

    function loop() {
      const newScroll = window.pageYOffset;
      scrollSet(newScroll);
      window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame(loop);
  }, []);

  return (
    <Fragment>
      <div className="bg" />

      <div className="header">
        <div>
          <h1>Emoji to Scale</h1>
          <a href="https://github.com/javierbyte/emoji-to-scale">+ Info</a>
        </div>
        <div style={{ flex: 1 }} />
        <a href="https://javier.xyz/">
          <h1>by javierbyte</h1>
        </a>
      </div>

      <div className="footer">
        <h2>
          Scroll <span style={{ fontSize: 28 }}>↓</span>
        </h2>
      </div>

      <div className="emoji-display">
        {data.map(([emoji, size, label]) => {
          const width = window.innerWidth;
          let relativeDistance = compoundDistance - scroll;

          if (relativeDistance < width / 2) {
            relativeDistance =
              relativeDistance * 0.25 + (0.75 * (relativeDistance + width * 0.5)) / 2;
          }

          compoundDistance += 256;

          if (relativeDistance < -256 || relativeDistance > width) {
            return null;
          }

          let emojisToScale = [Math.floor(scroll / 256), Math.ceil(scroll / 256)];

          emojisToScale = emojisToScale
            .map((idx) => {
              if (idx < 0) return 0;
              if (idx > data.length - 1) return data.length - 1;
              return idx;
            })
            .map((idx) => data[idx]);

          const floorCeilProgress = (scroll / 256) % 1;
          const floatScale =
            floorCeilProgress * emojisToScale[1][1] + (1 - floorCeilProgress) * emojisToScale[0][1];

          const calculatedScale = Math.min(size / floatScale, 1000);

          return (
            <div
              className="emoji-container"
              style={{
                transform: `translatex(${relativeDistance}px)`
              }}
              key={emoji}
            >
              <div
                className="emoji"
                style={{
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
    </Fragment>
  );
}

export default App;
