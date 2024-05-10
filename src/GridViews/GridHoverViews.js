import React from 'react';
// Function to handle mouse movement over the game grid
export function handleMouseMove(event, setHoverGridState, gridWidth) {
    // Assuming the game grid element has a class of 'af-class-gamebg'.
    const gameGridElement = document.querySelector('.af-class-gamebg');

    if (!gameGridElement) {
        // Exit early if the game grid element is not found.
        return;
    }

    // Get the bounding rectangle for the game grid element.
    const gridRect = gameGridElement.getBoundingClientRect();

    // Calculate the mouse position relative to the game grid.
    const relativeX = event.clientX - gridRect.left;
    const relativeY = event.clientY - gridRect.top;

    // Calculate the grid coordinates.
    const gridX = Math.max(0, Math.floor(relativeX / 60)); // Assuming grid cell width is 60px.
    const gridY = Math.max(0, Math.floor(relativeY / 60)); // Assuming grid cell height is 60px.

    // Update hover state if mouse is within grid boundaries.
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridWidth) {
        const hoverGrid = { x: gridX, y: gridY };
        setHoverGridState(hoverGrid);
    } else {
        // Optional: clear hover state if mouse leaves the game grid boundaries.
        setHoverGridState(null);
    }
}

function isAsteroidOrStarOnPath(pos, mainShip, hoverGrid) {

    // Only check if hoverGrid is defined
    if (!hoverGrid || !mainShip) {
        return false;
    }

    // Check if pos is on the same row or column as the mainShip and hoverGrid.
    const isSameRow = (pos.y === mainShip.y) && (pos.y === hoverGrid.y);
    const isSameColumn = (pos.x === mainShip.x) && (pos.x === hoverGrid.x);

    if (isSameRow) {
        // Check if pos.x is between mainShip.x and hoverGrid.x
        return (pos.x - mainShip.x) * (pos.x - hoverGrid.x) <= 0;
    } else if (isSameColumn) {
        // Check if pos.y is between mainShip.y and hoverGrid.y
        return (pos.y - mainShip.y) * (pos.y - hoverGrid.y) <= 0;
    }

    // Check if pos is on a diagonal path
    const deltaX = mainShip.x - hoverGrid.x;
    const deltaY = mainShip.y - hoverGrid.y;

    // To be on the same diagonal, the differences in x and y from the mainShip to hoverGrid 
    // should be equal to those to pos (in terms of absolute value)
    if (deltaX !== 0 && deltaY !== 0 && Math.abs(deltaX) === Math.abs(deltaY)) {
        // Calculate gradient and check if position follows the line based on the formula y - y1 = m(x - x1)
        const gradient = deltaY / deltaX;
        return (pos.y - mainShip.y) === gradient * (pos.x - mainShip.x) &&
            (pos.x - mainShip.x) * (pos.x - hoverGrid.x) <= 0 &&
            (pos.y - mainShip.y) * (pos.y - hoverGrid.y) <= 0;
    }

    return false;
}

export function sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions) {
    const isOnAsteroidOrStar = asteroidPositions.some(
        (pos) => pos.x === hoverGrid.x && pos.y === hoverGrid.y
    );

    if (isOnAsteroidOrStar) {
        return { shouldRender: false };
    }

    const distanceX = Math.abs(hoverGrid.x - mainShip.x);
    const distanceY = Math.abs(hoverGrid.y - mainShip.y);

    const isPathBlocked = asteroidPositions.some(pos =>
        isAsteroidOrStarOnPath(pos, mainShip, hoverGrid)
    );

    return { shouldRender: !isPathBlocked, distanceX, distanceY };
}

export function renderAttackShadowEffect(hoverGrid, mainShip, asteroidPositions, starPosition, isPermanent = false, shotName = null, setMainshipRotation) {
    const { shouldRender, distanceX, distanceY } = sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions, starPosition);
    if (!shouldRender && !isPermanent) return null;
    const isHorizontalOrVertical = (distanceX <= 4 && distanceY === 0) || (distanceX === 0 && distanceY <= 4);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= 4;

    if ((isHorizontalOrVertical || isStraightDiagonal) || isPermanent) {
        // Calculate the steps needed to draw the path
        const steps = Math.max(Math.abs(hoverGrid.x - mainShip.x), Math.abs(hoverGrid.y - mainShip.y));
        const deltaX = (hoverGrid.x - mainShip.x) / steps;
        const deltaY = (hoverGrid.y - mainShip.y) / steps;
        const angleRadians = Math.atan2(hoverGrid.y - mainShip.y, hoverGrid.x - mainShip.x);
        let angleDeg = angleRadians * (180 / Math.PI) + 90;

        if (angleDeg === 0) {
            angleDeg = 1 // FIXME, I don't quite understand this
        }

        let pathElements = [];

        const gridSize = 12; // TODO hardcoded grid size
        let totalSteps = 0;
        if (!isPermanent || mainShip) {
            totalSteps = 4; 
        }
        // Generate divs and images for each step in the path
        for (let i = 1; i <= totalSteps; i++) {
            const stepX = mainShip.x + deltaX * i;
            const stepY = mainShip.y + deltaY * i;
            if (!stepX || !stepY || stepX >= gridSize || stepY >= gridSize) continue;
            const key = `path-${stepX}-${stepY}`;

            // JSX for the shot image at each step
            const shotImage = shotName ? (
                <img
                    key={`shot-${key}`}
                    src={`images/${shotName}.png`}
                    alt={shotName}
                    className="af-class-objects af-class-shot"
                    style={{
                        top: `${stepY * 60 + 21}px`,
                        left: `${stepX * 60 + 21}px`,
                        position: 'absolute',
                        width: '18px',
                        height: '18px',
                        opacity: 0.75,
                        zIndex: 5, // Ensure the shot image is on top of the shadow effects
                    }}
                />
            ) : null;

            pathElements.push(shotImage);
        }
        if (mainShip.rotation !== angleDeg) {
            console.log('Setting mainship rotation:', angleDeg, mainShip.rotation);
            setMainshipRotation({
                mainShip: { x: mainShip.x, y: mainShip.y, rotation: angleDeg },
                permanentHoverGrid: { x: mainShip.x, y: mainShip.y, rotation: angleDeg },
            });
        }
        return pathElements;
    }
    return null;
}

export function renderMoveShadowEffect(hoverGrid, mainShip, asteroidPositions, starPosition, isPermanent = false, shipName = null) {
    const { shouldRender, distanceX, distanceY } = sharedHoverGridLogic(hoverGrid, mainShip, asteroidPositions, starPosition);
    if (!shouldRender && !isPermanent) return null;
    const isHorizontalOrVertical = (distanceX <= 3 && distanceY === 0) || (distanceX === 0 && distanceY <= 3);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= 3;

    if ((isHorizontalOrVertical || isStraightDiagonal) || isPermanent) {
        // Calculate angle
        const angleRadians = Math.atan2(hoverGrid.y - mainShip.y, hoverGrid.x - mainShip.x);
        const angleDeg = hoverGrid.rotation ? hoverGrid.rotation : angleRadians * (180 / Math.PI) + 90;

        // Add an additional className for fading the image
        const shipStyle = {
            opacity: 0.75, // Adjust as needed for desired fading
            position: 'absolute',
            zIndex: 2, // Ensure the ship image is on top of the shadow effect
            transform: `rotate(${angleDeg}deg)` // Rotate the ship to face the moving direction
        };

        // JSX for the faded ship image
        const fadedShipImage = shipName ? (
            <img
                src={`images/${shipName}.svg`}
                alt={shipName}
                className="af-class-objects af-class-faded-ship"
                style={{
                    ...shipStyle,
                    top: `${hoverGrid.y * 60}px`, // Positioning based on the hover grid
                    left: `${hoverGrid.x * 60}px`,
                }}
            />
        ) : null;

        return (
            <>
                <div
                    className="af-class-shadow-effect"
                    style={{
                        top: `${hoverGrid.y * 60}px`,
                        left: `${hoverGrid.x * 60}px`,
                        position: 'absolute',
                        width: '60px',
                        height: '60px',
                        backgroundColor: 'rgba(255,165,0, 0.3)'  // Shadow with some transparency
                    }}
                />
                {fadedShipImage}
            </>
        );
    } else {
        return null;
    }
}

export function renderGridOverlay(hoverGrid, mainShip, shipPositions, astPositions, mainShipName, mainShotName, actionType, setMainshipRotation) {
    const gridToShow = hoverGrid;

    if (!mainShip) {
        mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = astPositions;

    if (gridToShow) {
        if (actionType === 'move') {
            return renderMoveShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, false, mainShipName);
        } else if (actionType === 'attack') {
            return renderAttackShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, false, mainShotName, setMainshipRotation);
        }
    } else {
        return null;
    }
}

export function renderPermanentHoverGrid(mainShip, shipPositions, astPositions, permanentHoverGrid, mainShipName) {
    const gridToShow = permanentHoverGrid;

    if (!mainShip) {
        mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = astPositions;

    if (gridToShow) {
        return renderMoveShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, true, mainShipName);
    } else {
        return null;
    }
}

export function renderPermanentAttackGrid(mainShip, shipPositions, astPositions, permanentAttackGrid, mainShotName, setMainshipRotation) {
    const gridToShow = permanentAttackGrid;

    if (!mainShip) {
        mainShip = shipPositions.orangeShip;
    }

    // Assuming star position is stored in state
    const starPosition = shipPositions.star;

    // Assuming asteroid positions are stored in state in a similar format as shipPositions
    const asteroidPositions = astPositions;

    if (gridToShow) {
        return renderAttackShadowEffect(gridToShow, mainShip, asteroidPositions, starPosition, true, mainShotName, setMainshipRotation);
    } else {
        return null;
    }
}

export function renderObject(name, position) {
    const style = {
        top: `${(position.y) * 60}px`,
        left: `${position.x * 60}px`,
        transform: `rotate(${position.rotation}deg)`
    };

    const imagePath = name.includes('asteroid') ? 'images/asteroid.svg' : `images/${name}.svg`;

    return (
        <img
            key={name}
            src={imagePath}
            alt={name}
            className={`af-class-objects`}
            style={style}
        />
    );
}

// This function now accepts necessary parameters and returns an object with necessary state updates if any are needed.
export function handleGridClick(hoverGrid, mainShip, astPositions, starPosition, actionType, setPermanentHoverGridState, setPermanentAttackGridState) {
    const { shouldRender, distanceX, distanceY } = sharedHoverGridLogic(hoverGrid, mainShip, astPositions, starPosition);
    const range = actionType === 'move' ? 3 : 4;
    const isHorizontalOrVertical = (distanceX <= range && distanceY === 0) || (distanceX === 0 && distanceY <= range);
    const isStraightDiagonal = distanceX === distanceY && distanceX <= range;

    if (!shouldRender) return null;
    console.log('Grid clicked:', hoverGrid);

    if ((isHorizontalOrVertical || isStraightDiagonal)) {
        if (actionType === 'move') {
            // Return a callback that will be used to update the state in the component.
            console.log('Moving to:', hoverGrid);
            // Calculate angle
            const angleRadians = Math.atan2(hoverGrid.y - mainShip.y, hoverGrid.x - mainShip.x);
            const angleDeg = angleRadians * (180 / Math.PI) + 90;
            setPermanentHoverGridState({
                permanentHoverGrid: { ...hoverGrid, rotation: angleDeg },
                originalMainShip: { ...mainShip },
                mainShip: { ...hoverGrid, rotation: angleDeg },
                actionType: 'attack',
            });
        } else if (actionType === 'attack') {
            // Return a callback that will be used to update the state in the component.
            setPermanentAttackGridState({
                permanentAttackGrid: { ...hoverGrid },
                actionType: 'move',
            });
        }
    }
}
