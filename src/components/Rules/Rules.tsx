import modal from '../../styles/Modal.module.css';
import styles from './Rules.module.css';

interface RulesProps {
  onClose: () => void;
}

export function Rules({ onClose }: RulesProps) {
  return (
    <div className={`${modal.overlay} ${modal.overlayTop}`}>
      <div className={`${modal.panel} ${styles.rulesPanel}`}>
        <h3>Game Rules</h3>

        <div className={styles.content}>
          <div className={styles.section}>
            <h4>Validity</h4>
            <p>
              All words played must be found in the game dictionary (TWL06).
              Proper nouns, abbreviations, and hyphenated words are not allowed.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Placement</h4>
            <p>
              The first word must cross the center star. After that, every new
              word must connect to at least one tile already on the board.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Direction</h4>
            <p>
              All tiles placed in a single turn must lie in one row or one
              column, forming a continuous word with no gaps.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Multiple Words</h4>
            <p>
              If your tiles touch existing tiles to form additional words (crosswords),
              every new word formed must also be valid.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Scoring</h4>
            <p>
              Each letter has a point value. Premium squares (double/triple letter
              and double/triple word) only apply when a tile is first placed on
              them. A bonus of 50 points is awarded for using all 7 tiles in one
              turn.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Blank Tiles</h4>
            <p>
              Blank tiles can represent any letter but are worth 0 points. Once
              placed, the chosen letter cannot be changed.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Exchanging Tiles</h4>
            <p>
              Instead of placing tiles, you may exchange one or more tiles from
              your rack for new ones from the bag (if at least 7 tiles remain).
              This uses your turn.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Passing</h4>
            <p>
              You may pass your turn without placing or exchanging tiles.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Ending the Game</h4>
            <p>
              The game ends when the tile bag is empty and one player uses all
              remaining rack tiles, or when all players pass twice in a row.
              Remaining tiles on racks are subtracted from each player's score.
            </p>
          </div>

          <div className={styles.section}>
            <h4>Legal Moves</h4>
            <ul>
              <li><strong>Adding on:</strong> Extend an existing word by placing tiles before or after it.</li>
              <li><strong>Parallel play:</strong> Place a word parallel to an existing one so that every adjacent pair forms a valid word.</li>
            </ul>
          </div>
        </div>

        <div className={modal.actions}>
          <button className={`${modal.btn} ${modal.btnPrimary}`} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
