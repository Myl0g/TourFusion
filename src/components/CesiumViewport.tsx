import { Viewer, Math as CMath, Cartesian3, Cartesian2, SceneMode } from "cesium";
import React, { useEffect, useRef, useState } from "react";
import { CCPosition, CCLocation, TourFusionLocation, changeType } from "../common/types";
import Button from "./Button";
import ListView from "./ListView";

export default function CesiumViewport({ updateStateClickedPos, updateStateClickedLoc, clickedPos } : any) {
  const endpoint = 'http://localhost:5000/api';
  const [map, setMap] = useState<Viewer|null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const maxHeightVal = 1000000.0;

  // Load in the Cesium Container
  useEffect(() => {
    if (divRef.current) {
      const viewerInstance = new Viewer(divRef.current,
        {
          infoBox: false,
          timeline: false,
          animation: false,
          homeButton: false,
          fullscreenButton: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
        }
      );
      viewerInstance.resolutionScale = 1.0; // We might be able to use this?
      setMap(viewerInstance);

      return () => viewerInstance?.destroy();
    }
  }, []);

  // Load in the user's locations
  useEffect(() => {
    const getUserLocations = async () => {
      return await queryGraphQLforUserLocations();
    }
    getUserLocations();
  }, [])

  // Load in the user's recommended locations
  useEffect(() => {
    const getRecommendedLocations = async () => {
      return await [];
    }
    getRecommendedLocations();
  }, [])

  useEffect(() => {
    if (clickedPos) {
      if (clickedPos.height > maxHeightVal) {
        zoomOut(clickedPos, maxHeightVal);
      } else {
        zoomToPosition(clickedPos);
      }

      const fetchInformation = async () => {
        const value = await getLocationNameByCoordinate(clickedPos?.latitude, clickedPos?.longitude)
        updateStateClickedLoc(value)
      }
      fetchInformation()
    }
    
  }, [clickedPos]);

  // Get latitude and longitude
	const getPositionOnClick = (clicked : any) => {
    if (map === null)
      return;

    const viewer = map;  
    const ellipsoid = viewer.scene.globe.ellipsoid;
  
    let cartesian: Cartesian3 | undefined = undefined;
    
    cartesian = viewer.camera.pickEllipsoid(new Cartesian2(clicked.clientX, clicked.clientY), ellipsoid);
    if (cartesian) {
        let cartographic = ellipsoid.cartesianToCartographic(cartesian);
        const valuesToPass : CCPosition = {
          longitude : CMath.toDegrees(cartographic.longitude),
          latitude : CMath.toDegrees(cartographic.latitude),
          height : Math.ceil(viewer.camera.positionCartographic.height)
        }
        
        console.log("Latitude: " + valuesToPass.latitude);
        console.log("Longitude: " + valuesToPass.longitude);
        console.log("Height: " + valuesToPass.height);

        updateStateClickedPos(valuesToPass)
    }
  }


  const getLocationNameByCoordinate = (latitude: number | undefined, longitude: number | undefined): Promise<CCLocation> => {
    let baseUrl = "https://dev.virtualearth.net/REST/v1/Locations/";
    var url = baseUrl + latitude + "," + longitude + "?&key=" + import.meta.env.VITE_BING_MAPS_API_KEY;
    let requestedNamedLocation: Promise<CCLocation> = fetch(url)
    .then(result => result.json().then(
      res => {
        if (res.resourceSets[0].resources[0] !== undefined)
        {
            var locationInformation = res.resourceSets[0].resources[0].address;
            console.log(res.resourceSets[0].resources[0].address);
            console.log(locationInformation.locality + ", " + locationInformation.countryRegion);
            return {
              street: locationInformation.addressLine,
              city: locationInformation.locality,
              country: locationInformation.countryRegion,
              address: locationInformation.formattedAddress,
              postal: locationInformation.postalCode,
            }
          } else {
            return {
              street: "",
              city: "",
              country: "",
              address: "",
              postal: "",
            }
          }
        })
    );
    return requestedNamedLocation;
  }


  function zoomToPosition(position: CCPosition | null){
    if (position) {
    map?.camera.flyTo({
      destination: Cartesian3.fromDegrees(position.longitude, 
                                          position.latitude, 
                                          position.height
                                          ),
      orientation: {
        heading: CMath.toRadians(0.0),
        pitch: CMath.toRadians(-90.0),
      }
    });
    }
  }

  function zoomOut(position : CCPosition, height : number){
    map?.camera.flyTo({
      destination: Cartesian3.fromDegrees(position.longitude, 
                                          position.latitude, 
                                          height
                                          ),
      orientation: {
        heading: CMath.toRadians(0.0),
        pitch: CMath.toRadians(-90.0),
      }
    });
  }

  function handleUserClicks(e : any) {
    getPositionOnClick(e);
    updateStateClickedLoc(null);
  }

  return (
      <div className="grid grid-cols-2">
        <div className="z-0 fixed w-full h-full" 
             ref={divRef}
             onDoubleClick={handleUserClicks}
          />
      </div>
        
  );
}
